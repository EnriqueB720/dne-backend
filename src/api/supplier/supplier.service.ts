import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { SupplierArgs, SupplierCreateInput, SupplierSearchInput } from './dto';
import { Supplier, SupplierSelect } from './model';
import { PostService } from '../post/post.service';

@Injectable()
export class SupplierService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly postService: PostService,
  ) {}

  public async findOne(
    { where }: SupplierArgs,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    const supplier: any = await this.prismaService.supplier.findFirst({
      where,
      select
    });

    if (supplier?.posts) {
      supplier.posts = this.postService.parsePostPrice(supplier.posts);
    }

    return supplier;
  }

  public async findMany(
    { select }: SupplierSelect,
  ): Promise<Supplier[]> {
    const suppliers: any[] = await this.prismaService.supplier.findMany({
      orderBy: { companyName: 'asc' },
      select,
    });

    return suppliers.map((s) => {
      if (s?.posts) {
        s.posts = this.postService.parsePostPrice(s.posts);
      }
      return s;
    });
  }

  public async create(
    data: SupplierCreateInput,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    const supplier: any = await this.prismaService.supplier.create({
      data,
      select
    });

    if (supplier?.posts) {
      supplier.posts = this.postService.parsePostPrice(supplier.posts);
    }

    return supplier;
  }

  async companyNameExists(companyName: string): Promise<boolean> {
    const supplier = await this.prismaService.supplier.findFirst({
      where: {
        companyName: { contains: companyName, mode: 'insensitive' },
      },
      select: {
        supplierId: true,
      },
    });

    return !!supplier;
  }

  /**
   * Search for suppliers in the DB matching a customer's intent.
   *
   * Strategy:
   *  - service / capacity / category filters run in SQL (Prisma).
   *  - city matching is done in JS so it can be ACCENT-insensitive
   *    ("san jose" ↔ "San José") — Postgres `contains` is only
   *    case-insensitive, not accent-insensitive, without the `unaccent`
   *    extension. Suppliers in the requested city (or serving it via a
   *    service area) are ranked first; everything else follows.
   *  - this means a valid service query NEVER returns an empty list just
   *    because the exact city had no match — it degrades gracefully to
   *    "service matches elsewhere", and the caller/AI can explain that.
   */
  public async search(
    { serviceQuery, city, guestCount, categoryId, limit }: SupplierSearchInput,
    { select }: SupplierSelect,
  ): Promise<Supplier[]> {
    const ands: any[] = [];

    if (guestCount && guestCount > 0) {
      ands.push({
        OR: [{ minCapacity: null }, { minCapacity: { lte: guestCount } }],
      });
      ands.push({
        OR: [{ maxCapacity: null }, { maxCapacity: { gte: guestCount } }],
      });
    }

    if (categoryId) {
      ands.push({
        categories: { some: { categoryId } },
      });
    }

    if (serviceQuery && serviceQuery.trim()) {
      // Split into tokens (each alphanumeric word). "DJ services" → ["DJ", "services"].
      // Match the supplier if ANY token appears in ANY field — much more forgiving.
      const tokens = serviceQuery
        .trim()
        .split(/\s+/)
        .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
        .filter((t) => t.length >= 2);

      const tokenClauses = (tokens.length > 0 ? tokens : [serviceQuery.trim()]).flatMap((q) => [
        { companyName: { contains: q, mode: 'insensitive' as const } },
        { tagline: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { services: { some: { name: { contains: q, mode: 'insensitive' as const } } } },
        { services: { some: { description: { contains: q, mode: 'insensitive' as const } } } },
        {
          categories: {
            some: {
              category: {
                OR: [
                  { categoryName: { contains: q, mode: 'insensitive' as const } },
                  { nameEs: { contains: q, mode: 'insensitive' as const } },
                  { nameEn: { contains: q, mode: 'insensitive' as const } },
                  { slug: { contains: q.toLowerCase(), mode: 'insensitive' as const } },
                ],
              },
            },
          },
        },
      ]);

      ands.push({ OR: tokenClauses });
    }

    const where: any = { deletedAt: null, ...(ands.length > 0 && { AND: ands }) };

    const take = limit && limit > 0 ? limit : 4;
    // Pull a wider pool than `take` so the JS-side city ranking has material
    // to promote from. Bounded so we never scan the whole table.
    const poolSize = Math.min(Math.max(take * 4, 20), 60);

    // Always select `city` + service-area cities for ranking, on top of
    // whatever the GraphQL layer asked for. Extra fields are harmless — the
    // GraphQL response only serializes what the query requested.
    const mergedSelect: any = { ...(select ?? {}) };
    mergedSelect.city = true;
    if (!mergedSelect.serviceAreas) {
      mergedSelect.serviceAreas = { select: { city: true } };
    }

    const suppliers: any[] = await this.prismaService.supplier.findMany({
      where,
      orderBy: [
        { verified: 'desc' },
        { rating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: poolSize,
      select: mergedSelect,
    });

    let ranked = suppliers;
    if (city && city.trim()) {
      const target = this.normalizeForMatch(city);
      const inCity: any[] = [];
      const elsewhere: any[] = [];
      for (const s of suppliers) {
        const supplierCity = this.normalizeForMatch(s?.city ?? '');
        const directMatch = this.cityMatches(supplierCity, target);
        const areaMatch = (s?.serviceAreas ?? []).some((a: any) =>
          this.cityMatches(this.normalizeForMatch(a?.city ?? ''), target),
        );
        if (directMatch || areaMatch) inCity.push(s);
        else elsewhere.push(s);
      }
      // City matches first, then the rest — both already rating-ordered.
      ranked = [...inCity, ...elsewhere];
    }

    return ranked.slice(0, take).map((s) => {
      if (s?.posts) s.posts = this.postService.parsePostPrice(s.posts);
      return s;
    });
  }

  /** Lowercase + strip diacritics so "San José" and "san jose" compare equal. */
  private normalizeForMatch(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  /** Substring match in either direction — handles "San José" vs "San José Centro". */
  private cityMatches(a: string, b: string): boolean {
    if (!a || !b) return false;
    return a.includes(b) || b.includes(a);
  }
}
