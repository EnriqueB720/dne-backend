import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, QuoteStatus, RequestStatus } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { SupplierArgs, SupplierCreateInput, SupplierSearchInput, SupplierUpdateInput } from './dto';
import { Supplier, SupplierDashboardStats, SupplierSelect } from './model';
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

  public async update(
    { supplierId, ...data }: SupplierUpdateInput,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    // Cast: Prisma's strict return type doesn't include the relation shapes
    // the GraphQL ObjectType declares as eager fields.
    return (await this.prismaService.supplier.update({
      where: { supplierId },
      data,
      select,
    })) as unknown as Supplier;
  }

  /**
   * Aggregate metrics for the supplier workspace dashboard.
   *
   * - `responseRate`   — quotes sent ÷ matched-leads in the last 30d (%)
   * - `conversionRate` — accepted quotes ÷ (accepted + rejected + expired) (%)
   * - `activeLeadsCount` — open leads currently matching (city, not yet quoted)
   * - `mtdEarnings`    — sum of supplierPayout for bookings created this month
   * - `weeklyLeadCounts` — count of matched requests created on each of the
   *   last 7 days, oldest → newest, useful for a sparkline / bar chart
   */
  public async getDashboardStats(supplierId: number): Promise<SupplierDashboardStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const supplier = await this.prismaService.supplier.findUnique({
      where: { supplierId },
      select: { city: true },
    });
    if (!supplier) {
      return {
        responseRate: 0,
        conversionRate: 0,
        activeLeadsCount: 0,
        mtdEarnings: '0',
        mtdGross: '0',
        currency: 'CRC',
        platformFeeRate: 0.1,
        weeklyLeadCounts: [0, 0, 0, 0, 0, 0, 0],
      };
    }

    // Same permissive city predicate the matcher uses for fan-out.
    const matchWhere: Prisma.RequestWhereInput = supplier.city
      ? {
          OR: [
            { city: { equals: supplier.city, mode: 'insensitive' } },
            { city: null },
          ],
        }
      : {};

    const [
      matchedLast30d,
      quotesLast30d,
      conversionBuckets,
      activeLeadsCount,
      paidBookings,
      weeklyLeadRows,
    ] = await Promise.all([
      this.prismaService.request.count({
        where: { ...matchWhere, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prismaService.quote.count({
        where: { supplierId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prismaService.quote.groupBy({
        by: ['status'],
        where: {
          supplierId,
          status: { in: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED] },
        },
        _count: true,
      }),
      this.prismaService.request.count({
        where: {
          ...matchWhere,
          status: {
            in: [
              RequestStatus.MATCHING,
              RequestStatus.AWAITING_QUOTES,
              RequestStatus.QUOTES_RECEIVED,
            ],
          },
          quotes: { none: { supplierId } },
        },
      }),
      this.prismaService.booking.findMany({
        where: {
          supplierId,
          createdAt: { gte: startOfMonth },
          status: {
            in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED],
          },
        },
        select: { supplierPayout: true, totalPrice: true, currency: true },
      }),
      this.prismaService.request.findMany({
        where: {
          ...matchWhere,
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { createdAt: true },
      }),
    ]);

    // Response rate
    const responseRate =
      matchedLast30d > 0 ? Math.round((quotesLast30d / matchedLast30d) * 100) : 0;

    // Conversion rate from grouped counts
    const totals = conversionBuckets.reduce(
      (acc, b) => acc + (b._count as unknown as number),
      0,
    );
    const accepted =
      conversionBuckets.find((b) => b.status === QuoteStatus.ACCEPTED)?._count ?? 0;
    const conversionRate =
      totals > 0 ? Math.round(((accepted as unknown as number) / totals) * 100) : 0;

    // Earnings — both net (supplierPayout) and gross (totalPrice), using the
    // first booking's currency as the display label.
    let mtdEarningsDec = new Prisma.Decimal(0);
    let mtdGrossDec = new Prisma.Decimal(0);
    for (const b of paidBookings) {
      mtdEarningsDec = mtdEarningsDec.add(b.supplierPayout);
      mtdGrossDec = mtdGrossDec.add(b.totalPrice);
    }
    const currency = paidBookings[0]?.currency ?? 'CRC';

    // Weekly bucket: 7 day-of-week buckets, oldest first
    const weeklyLeadCounts = new Array(7).fill(0) as number[];
    for (const r of weeklyLeadRows) {
      const dayIndex = Math.min(
        6,
        Math.max(0, Math.floor((now.getTime() - r.createdAt.getTime()) / (24 * 60 * 60 * 1000))),
      );
      // Reverse so newest is at the end of the array.
      weeklyLeadCounts[6 - dayIndex] += 1;
    }

    return {
      responseRate,
      conversionRate,
      activeLeadsCount,
      mtdEarnings: mtdEarningsDec.toString(),
      mtdGross: mtdGrossDec.toString(),
      currency,
      // Kept in sync with PLATFORM_FEE_RATE in quote.service.ts. If that
      // changes, change this too (one place to look for the displayed %).
      platformFeeRate: 0.1,
      weeklyLeadCounts,
    };
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
