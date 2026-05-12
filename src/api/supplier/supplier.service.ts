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
   * Filters by serviceQuery (across name/description/services/category names),
   * city (supplier.city OR any serviceArea city), guest capacity, and category.
   * Excludes soft-deleted suppliers. Orders by rating then review count.
   */
  public async search(
    { serviceQuery, city, guestCount, categoryId, limit }: SupplierSearchInput,
    { select }: SupplierSelect,
  ): Promise<Supplier[]> {
    const ands: any[] = [];

    if (city && city.trim()) {
      const c = city.trim();
      ands.push({
        OR: [
          { city: { contains: c, mode: 'insensitive' } },
          { serviceAreas: { some: { city: { contains: c, mode: 'insensitive' } } } },
        ],
      });
    }

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

    const suppliers: any[] = await this.prismaService.supplier.findMany({
      where,
      orderBy: [
        { verified: 'desc' },
        { rating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit && limit > 0 ? limit : 4,
      select,
    });

    return suppliers.map((s) => {
      if (s?.posts) s.posts = this.postService.parsePostPrice(s.posts);
      return s;
    });
  }
}
