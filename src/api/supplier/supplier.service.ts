import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, PromotionTier, QuoteStatus, RequestStatus } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import {
  SupplierArgs,
  SupplierCategoriesInput,
  SupplierCreateInput,
  SupplierMediaDeleteInput,
  SupplierMediaReorderInput,
  SupplierSearchInput,
  SupplierUpdateInput,
} from './dto';
import { Supplier, SupplierDashboardStats, SupplierSelect } from './model';
import { PostService } from '../post/post.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { GoogleDriveService } from '../../shared/google-drive/google-drive.service';
import { buildSupplierEmbeddingText } from './supplier-embedding.text';

/**
 * Fields whose value contributes to a supplier's semantic-search
 * embedding. When any of these change on `update()`, we re-embed.
 */
const EMBEDDING_SOURCE_FIELDS = ['companyName', 'tagline', 'description'] as const;

/**
 * Cap on how many categories one supplier may claim. Without a limit the
 * cheapest way to win more leads is to tick every box, which degrades
 * matching for everyone.
 */
const MAX_SUPPLIER_CATEGORIES = 5;

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly postService: PostService,
    private readonly embeddingService: EmbeddingService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /**
   * Fire-and-forget re-embed of a supplier's description vector. Called
   * after create or field-changing update — never blocks the caller
   * (embedding round-trip is 200–500ms) and never throws into the write
   * path. If the embedding API is down or the key is missing, the write
   * still succeeds; the supplier just won't semantic-search until the
   * next successful re-embed (or a manual backfill run).
   */
  public scheduleEmbed(supplierId: number): void {
    if (!this.embeddingService.isEnabled()) return;
    void this.embedAndPersist(supplierId).catch((err) => {
      this.logger.warn(
        `Supplier embed failed for supplierId=${supplierId}: ${(err as Error).message}`,
      );
    });
  }

  private async embedAndPersist(supplierId: number): Promise<void> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { supplierId },
      select: {
        supplierId: true,
        companyName: true,
        tagline: true,
        description: true,
        services: { select: { name: true, description: true } },
        categories: { select: { category: { select: { categoryName: true } } } },
      },
    });
    if (!supplier) return;

    const text = buildSupplierEmbeddingText(supplier);
    const vector = await this.embeddingService.embed(text);
    await this.prismaService.$executeRawUnsafe(
      'UPDATE supplier SET description_embedding = $1::vector WHERE supplier_id = $2',
      EmbeddingService.toVectorLiteral(vector),
      supplierId,
    );
  }

  /**
   * The GraphQL→Prisma select built by `@GraphQLFields()` is selection-only:
   * it has no idea that services can be soft-deleted/disabled or that
   * gallery photos have an author-chosen order. Layer those relation
   * filters on before the query runs so every read path (findOne, findMany,
   * both search paths) agrees on what the storefront shows.
   */
  private withRelationFilters(select: any): any {
    if (!select) return select;
    const merged: any = { ...select };

    if (merged.services) {
      merged.services = {
        ...merged.services,
        where: { deletedAt: null, active: true },
        orderBy: [{ serviceId: 'asc' }],
      };
    }

    if (merged.media) {
      merged.media = {
        ...merged.media,
        where: { deletedAt: null },
        orderBy: [{ displayOrder: 'asc' }, { mediaAssetId: 'asc' }],
      };
    }

    return merged;
  }

  public async findOne(
    { where }: SupplierArgs,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    const supplier: any = await this.prismaService.supplier.findFirst({
      where,
      select: this.withRelationFilters(select),
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
      select: this.withRelationFilters(select),
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

    if (supplier?.supplierId) {
      this.scheduleEmbed(supplier.supplierId);
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
    input: SupplierSearchInput,
    { select }: SupplierSelect,
  ): Promise<Supplier[]> {
    const { serviceQuery, city, guestCount, categoryId, limit } = input;
    const take = limit && limit > 0 ? limit : 4;

    // Semantic first. When the embedding API is available and we have a
    // service query, we resolve the pool via pgvector cosine distance
    // instead of keyword matching — catches "fridge repair" → "appliance
    // repair" that literal `contains` would miss.
    const semanticIds = await this.resolveSemanticPool(
      serviceQuery,
      { guestCount, categoryId },
      // Take a wider pool for the reranker below to work with.
      Math.min(Math.max(take * 4, 20), 60),
    );

    const semantic =
      semanticIds && semanticIds.length > 0
        ? await this.finishSearchFromIds(semanticIds, city, limit, select)
        : [];

    if (semantic.length >= take) return semantic;

    // Top up from keyword search whenever the vector pool comes up short.
    // A thin or empty pool usually says nothing about relevance: the
    // supplier's embedding may never have been written (the embedding API
    // was down when it was created, and nothing retries), or the phrasing
    // sits just past the distance cutoff. Returning the short list as-is
    // makes those suppliers unreachable by ANY search — and the chat
    // quietly backfills the empty slots with out-of-network AI suggestions,
    // which is what "the AI only returns providers outside our network"
    // looked like from the outside.
    const keyword = await this.keywordSearch(input, select, take);
    const seen = new Set<number>(semantic.map((s: any) => s.supplierId));
    const merged: any[] = [...semantic];
    for (const s of keyword as any[]) {
      if (seen.has(s.supplierId)) continue;
      merged.push(s);
      if (merged.length >= take) break;
    }

    // Rank the combined list rather than leaving the keyword top-ups tacked
    // on the end — otherwise a supplier based in the requested city sorts
    // below an out-of-city one purely because it arrived via the keyword
    // path (e.g. an Escazú DJ landing last on an Escazú search).
    return this.rankByCityAndPromotion(merged, city).slice(0, take);
  }

  /**
   * Literal `contains` search across name/tagline/description/services/
   * categories, with the same city + sponsored reranking the semantic path
   * uses. This is the floor under semantic search: it needs no embedding,
   * so it still finds a supplier the vector index can't see.
   */
  private async keywordSearch(
    { serviceQuery, city, guestCount, categoryId }: SupplierSearchInput,
    select: any,
    take: number,
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

    // Pull a wider pool than `take` so the JS-side city ranking has material
    // to promote from. Bounded so we never scan the whole table.
    const poolSize = Math.min(Math.max(take * 4, 20), 60);

    // Always select `city` + service-area cities for ranking, on top of
    // whatever the GraphQL layer asked for. Extra fields are harmless — the
    // GraphQL response only serializes what the query requested.
    const mergedSelect: any = this.withRelationFilters({ ...(select ?? {}) });
    // `supplierId` is needed to dedupe against the semantic results in
    // `search()`, regardless of what the GraphQL caller asked for.
    mergedSelect.supplierId = true;
    mergedSelect.city = true;
    // Always pull the promotion fields too — the JS-side reranker below
    // promotes FEATURED-active suppliers above their peers regardless of
    // what the GraphQL caller asked for.
    mergedSelect.promotionTier = true;
    mergedSelect.promotionStartDate = true;
    mergedSelect.promotionEndDate = true;
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

    const ranked = this.rankByCityAndPromotion(suppliers, city);

    return ranked.slice(0, take).map((s) => {
      if (s?.posts) s.posts = this.postService.parsePostPrice(s.posts);
      return s;
    });
  }

  /**
   * Returns supplier IDs ordered by semantic similarity to the query, or
   * `null` when semantic search shouldn't run (no query, embedding off,
   * or query embedding failed — caller falls back to keyword search).
   */
  private async resolveSemanticPool(
    serviceQuery: string | undefined,
    filters: { guestCount?: number; categoryId?: number },
    poolSize: number,
  ): Promise<number[] | null> {
    const query = serviceQuery?.trim();
    if (!query) return null;
    if (!this.embeddingService.isEnabled()) return null;

    let queryVector: number[];
    try {
      queryVector = await this.embeddingService.embed(query);
    } catch (err) {
      // If the embedding call fails, fall through to keyword search so
      // the user still gets *some* results.
      this.logger.warn(
        `Semantic search embed failed, falling back to keyword: ${(err as Error).message}`,
      );
      return null;
    }

    // Hard filters go into the WHERE so we don't rank rows the caller
    // would filter out anyway. Everything else (city, sponsored boost)
    // is a JS-side rerank in `finishSearchFromIds`.
    const conditions: string[] = ['deleted_at IS NULL', 'description_embedding IS NOT NULL'];
    const params: unknown[] = [EmbeddingService.toVectorLiteral(queryVector)];
    let nextParam = 2;

    if (filters.guestCount && filters.guestCount > 0) {
      conditions.push(`(max_capacity IS NULL OR max_capacity >= $${nextParam})`);
      params.push(filters.guestCount);
      nextParam++;
    }
    if (filters.categoryId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM supplier_category sc WHERE sc.supplier_id = supplier.supplier_id AND sc.category_id = $${nextParam})`,
      );
      params.push(filters.categoryId);
      nextParam++;
    }

    // `<=>` is the pgvector cosine-distance operator; smallest distance
    // wins. HNSW index makes this an ANN lookup instead of a full scan.
    //
    // The distance threshold caps how "far" a supplier can be and still
    // count as a match — without it, a small DB fills the pool with
    // marginal neighbours (movers/decor showing up for a cleaning query).
    // Cosine distance range is 0 (identical) → 2 (opposite). Measured
    // against the seeded catalogue with text-embedding-3-small: correct
    // matches land at 0.42–0.65 ("I need a dj" → DJ Carlos Mix 0.46, DJ
    // Mauricio 0.49, Pro Events DJ 0.55, Piki Tiki 0.64) while unrelated
    // suppliers only start around 0.75 (photographers/cleaners for that
    // same query). The old 0.55 default cut straight through the correct
    // set — it dropped two of the three DJs on a bare "DJ" query. 0.65
    // sits in the gap between the two clusters. Short queries score
    // systematically farther than long ones, so leave headroom here and
    // tune via SUPPLIER_SEMANTIC_MAX_DISTANCE per environment.
    const maxDistance = Number(process.env.SUPPLIER_SEMANTIC_MAX_DISTANCE ?? 0.65);
    const sql = `
      SELECT supplier_id
      FROM supplier
      WHERE ${conditions.join(' AND ')}
        AND (description_embedding <=> $1::vector) < ${maxDistance}
      ORDER BY description_embedding <=> $1::vector
      LIMIT ${Math.max(1, Math.floor(poolSize))};
    `;

    const rows = await this.prismaService.$queryRawUnsafe<{ supplier_id: number }[]>(
      sql,
      ...params,
    );
    return rows.map((r) => r.supplier_id);
  }

  /**
   * Second phase of a semantic search: takes the ordered supplier-id
   * pool, hydrates full rows (respecting the GraphQL select), applies
   * the same city + sponsored-boost reranking that the keyword path
   * does, then returns the top `limit`.
   */
  private async finishSearchFromIds(
    orderedIds: number[],
    city: string | undefined,
    limit: number | undefined,
    select: any,
  ): Promise<Supplier[]> {
    if (orderedIds.length === 0) return [];

    const take = limit && limit > 0 ? limit : 4;

    const mergedSelect: any = this.withRelationFilters({ ...(select ?? {}) });
    mergedSelect.supplierId = true;
    mergedSelect.city = true;
    mergedSelect.promotionTier = true;
    mergedSelect.promotionStartDate = true;
    mergedSelect.promotionEndDate = true;
    if (!mergedSelect.serviceAreas) {
      mergedSelect.serviceAreas = { select: { city: true } };
    }

    const rows = await this.prismaService.supplier.findMany({
      where: { supplierId: { in: orderedIds } },
      select: mergedSelect,
    });

    // Preserve the semantic order (`findMany` returns arbitrary order).
    const byId = new Map<number, any>(rows.map((r: any) => [r.supplierId, r]));
    const ordered: any[] = orderedIds
      .map((id) => byId.get(id))
      .filter((s): s is any => !!s);

    const ranked = this.rankByCityAndPromotion(ordered, city);

    return ranked.slice(0, take).map((s) => {
      if (s?.posts) s.posts = this.postService.parsePostPrice(s.posts);
      return s;
    });
  }

  public async update(
    { supplierId, ...data }: SupplierUpdateInput,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    // An omitted field means "leave it alone", but an explicitly empty
    // string means "clear it" — without this, a supplier could never remove
    // a phone number or website once saved (Prisma reads '' as a value to
    // write, and the old form sent `undefined` for blanks either way).
    const normalized: Record<string, unknown> = { ...data };
    for (const [key, value] of Object.entries(normalized)) {
      if (typeof value === 'string' && value.trim() === '') {
        normalized[key] = null;
      }
    }
    // companyName is required on the model — never null it out.
    if (normalized.companyName == null) delete normalized.companyName;

    // Cast: Prisma's strict return type doesn't include the relation shapes
    // the GraphQL ObjectType declares as eager fields.
    const result = (await this.prismaService.supplier.update({
      where: { supplierId },
      data: normalized,
      select: this.withRelationFilters(select),
    })) as unknown as Supplier;

    // Re-embed only when a field that contributes to the vector actually
    // changed — otherwise we'd burn an embedding call on every small
    // profile edit (avatar, verified flag, etc.).
    const changed = EMBEDDING_SOURCE_FIELDS.some((f) => (data as any)[f] !== undefined);
    if (changed) this.scheduleEmbed(supplierId);

    return result;
  }

  /**
   * Replace the supplier's category set.
   *
   * Categories were previously write-once from the seed scripts — there was
   * no API path at all — so the badges on a storefront could never change.
   * They also feed the semantic-search text, hence the re-embed.
   */
  public async setCategories({
    supplierId,
    categoryIds,
    primaryCategoryId,
  }: SupplierCategoriesInput): Promise<boolean> {
    const ids = [...new Set(categoryIds)].filter((id) => Number.isFinite(id));

    if (ids.length === 0) {
      throw new BadRequestException('Pick at least one category');
    }
    if (ids.length > MAX_SUPPLIER_CATEGORIES) {
      throw new BadRequestException(
        `Pick at most ${MAX_SUPPLIER_CATEGORIES} categories — listing everything makes matching worse, not better`,
      );
    }

    const known = await this.prismaService.category.findMany({
      where: { categoryId: { in: ids }, active: true },
      select: { categoryId: true },
    });
    if (known.length !== ids.length) {
      throw new BadRequestException('One of those categories does not exist');
    }

    // Exactly one primary, always — fall back to the first selection when
    // the requested primary isn't in the set.
    const primary =
      primaryCategoryId != null && ids.includes(primaryCategoryId)
        ? primaryCategoryId
        : ids[0];

    await this.prismaService.$transaction([
      this.prismaService.supplierCategory.deleteMany({ where: { supplierId } }),
      this.prismaService.supplierCategory.createMany({
        data: ids.map((categoryId) => ({
          supplierId,
          categoryId,
          isPrimary: categoryId === primary,
        })),
      }),
    ]);

    this.scheduleEmbed(supplierId);
    return true;
  }

  /**
   * Take a gallery photo off the storefront and out of storage.
   *
   * The row is hard-deleted rather than flagged: nothing references a
   * MediaAsset, and once the underlying file is gone a soft-deleted row
   * would only be a pointer to nothing. Storage deletion is best effort —
   * if Drive refuses, the photo still leaves the storefront and the
   * orphaned file is logged.
   */
  public async deleteMedia({
    mediaAssetId,
    supplierId,
  }: SupplierMediaDeleteInput): Promise<boolean> {
    const asset = await this.prismaService.mediaAsset.findUnique({
      where: { mediaAssetId },
      select: { supplierId: true, deletedAt: true, storageFileId: true, url: true },
    });
    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Photo not found');
    }
    if (asset.supplierId !== supplierId) {
      throw new BadRequestException('Photo does not belong to this supplier');
    }

    await this.googleDriveService.deleteStoredFile(
      asset.storageFileId ?? this.fileIdFromUrl(asset.url),
    );

    await this.prismaService.mediaAsset.delete({ where: { mediaAssetId } });
    return true;
  }

  /** Pull the Drive file id out of a legacy stored URL (`...id=<ID>&...`). */
  private fileIdFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const match = /[?&]id=([^&]+)/.exec(url);
    return match ? match[1] : null;
  }

  /**
   * Persist the gallery order the supplier dragged into place. Ids that
   * don't belong to this supplier are ignored rather than throwing, so a
   * stale tab can't wipe someone else's ordering.
   */
  public async reorderMedia({
    supplierId,
    mediaAssetIds,
  }: SupplierMediaReorderInput): Promise<boolean> {
    const owned = await this.prismaService.mediaAsset.findMany({
      where: { supplierId, deletedAt: null },
      select: { mediaAssetId: true },
    });
    const ownedIds = new Set(owned.map((a) => a.mediaAssetId));

    const ordered = mediaAssetIds.filter((id) => ownedIds.has(id));
    if (ordered.length === 0) return true;

    await this.prismaService.$transaction(
      ordered.map((mediaAssetId, index) =>
        this.prismaService.mediaAsset.update({
          where: { mediaAssetId },
          data: { displayOrder: index },
        }),
      ),
    );
    return true;
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
  }

  /** Lowercase + strip diacritics so "San José" and "san jose" compare equal. */
  /**
   * Shared final ordering for every search path: suppliers in (or serving)
   * the requested city first, then active FEATURED suppliers lifted above
   * their peers. Both passes are stable, so whatever relevance order the
   * caller came in with (semantic distance, or rating for keyword) still
   * decides ties.
   */
  private rankByCityAndPromotion(rows: any[], city?: string): any[] {
    let ranked = rows;

    if (city && city.trim()) {
      const target = this.normalizeForMatch(city);
      const inCity: any[] = [];
      const elsewhere: any[] = [];
      for (const s of ranked) {
        const supplierCity = this.normalizeForMatch(s?.city ?? '');
        const directMatch = this.cityMatches(supplierCity, target);
        const areaMatch = (s?.serviceAreas ?? []).some((a: any) =>
          this.cityMatches(this.normalizeForMatch(a?.city ?? ''), target),
        );
        if (directMatch || areaMatch) inCity.push(s);
        else elsewhere.push(s);
      }
      ranked = [...inCity, ...elsewhere];
    }

    // Sponsored boost — promote suppliers whose `promotionTier = FEATURED`
    // is currently active (start <= now, end null or in the future).
    const now = Date.now();
    const isActiveFeatured = (s: any): boolean => {
      if (s?.promotionTier !== PromotionTier.FEATURED) return false;
      const start = s?.promotionStartDate
        ? new Date(s.promotionStartDate).getTime()
        : null;
      const end = s?.promotionEndDate
        ? new Date(s.promotionEndDate).getTime()
        : null;
      if (start !== null && start > now) return false;
      if (end !== null && end < now) return false;
      return true;
    };

    return [
      ...ranked.filter(isActiveFeatured),
      ...ranked.filter((s) => !isActiveFeatured(s)),
    ];
  }

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
