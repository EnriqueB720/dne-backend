import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { GeoService, ProvinceResolution } from '../../shared/geo';
import { GoogleDriveService } from '../../shared/google-drive/google-drive.service';
import { ChatService } from '../chat/chat.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { SupplierCategoriesInput, SupplierSearchInput, SupplierUpdateInput } from './dto';
import { Supplier, SupplierSelect, SupplierStats } from './model';
import { buildSupplierEmbeddingText } from './supplier-embedding.text';
import {
  SKILL_DRAFT_SYSTEM_PROMPT,
  SkillDraftSource,
  buildSkillDraftPrompt,
  hasSkillDraftMaterial,
  normalizeSkills,
  parseSkillDraft,
} from './supplier-skills';

/** Everything the skill draft and the embedding text are built from. */
const SEARCH_SOURCE_SELECT = {
  supplierId: true,
  companyName: true,
  tagline: true,
  description: true,
  skills: true,
  services: { select: { name: true, description: true } },
  categories: { select: { category: { select: { nameEs: true, nameEn: true } } } },
} as const;

/** Fields whose change means the embedding is stale. */
const EMBEDDING_SOURCE_FIELDS = ['companyName', 'tagline', 'description'] as const;

/** Picking every category is the cheapest way to win leads and ruins matching. */
const MAX_SUPPLIER_CATEGORIES = 5;

const DEFAULT_SEARCH_LIMIT = 6;
const MAX_SEARCH_LIMIT = 20;

/**
 * A supplier nobody can reach is useless to the chat, so search only
 * returns rows with at least one published contact channel.
 */
const HAS_CONTACT_WHERE: Prisma.SupplierWhereInput = {
  OR: [
    { businessPhone: { not: null } },
    { whatsappNumber: { not: null } },
    { businessEmail: { not: null } },
    { websiteUrl: { not: null } },
  ],
};
const HAS_CONTACT_SQL =
  'coalesce(business_phone, whatsapp_number, business_email, website_url) IS NOT NULL';

interface SearchFilters {
  province?: string;
  categoryId?: number;
}

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly chatService: ChatService,
    private readonly geoService: GeoService,
  ) {}

  // ── Ownership ───────────────────────────────────────────────────────

  /** The supplier row owned by this user, or 403. */
  public async supplierIdForUser(userId: number): Promise<number> {
    const supplier = await this.prismaService.supplier.findFirst({
      where: { userId, deletedAt: null },
      select: { supplierId: true },
    });
    if (!supplier) throw new ForbiddenException('This account has no supplier profile');
    return supplier.supplierId;
  }

  // ── Reads ───────────────────────────────────────────────────────────

  /** Services oldest-first, photos in the supplier's chosen order. */
  private withRelationFilters(select: any): any {
    if (!select) return select;
    const merged: any = { ...select };
    if (merged.services) {
      merged.services = { ...merged.services, orderBy: [{ serviceId: 'asc' }] };
    }
    if (merged.media) {
      merged.media = {
        ...merged.media,
        orderBy: [{ displayOrder: 'asc' }, { mediaAssetId: 'asc' }],
      };
    }
    return merged;
  }

  public async findPublic(supplierId: number, { select }: SupplierSelect): Promise<Supplier> {
    const supplier = await this.prismaService.supplier.findFirst({
      where: { supplierId, deletedAt: null },
      select: this.withRelationFilters(select),
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier as unknown as Supplier;
  }

  public async findMine(userId: number, { select }: SupplierSelect): Promise<Supplier> {
    const supplierId = await this.supplierIdForUser(userId);
    return this.findPublic(supplierId, { select });
  }

  /** Browse list for the empty chat screen: preferred, then verified, then rating. */
  public async list(
    { province, limit }: { province?: string; limit?: number },
    { select }: SupplierSelect,
  ): Promise<Supplier[]> {
    const take = this.clampLimit(limit);
    const ids = await this.browseIds({ province: this.validProvince(province) }, take * 3);
    return this.hydrate(ids, select, province).then((rows) => rows.slice(0, take));
  }

  // ── Search (used by the AI chat) ────────────────────────────────────

  /**
   * Who can do X in zone Y. The zone is resolved from (in order) a picked
   * province, a place named in the message, or the device coordinates. When
   * a zone resolves the result is STRICT: only suppliers whose
   * `serviceProvinces` contain it. With no zone, the search is nationwide
   * and the chat asks the user where they are.
   *
   * Relevance: pgvector similarity on the supplier embedding, topped up by a
   * keyword pass (name, tagline, description, skills, services, categories)
   * when the vector pool is thin or embeddings are off. Final order:
   * active preferred placement → based in the province → relevance.
   */
  public async search(
    input: SupplierSearchInput,
    { select }: SupplierSelect,
  ): Promise<{ province: ProvinceResolution | null; suppliers: Supplier[] }> {
    const resolved = this.geoService.resolve({
      province: input.province,
      location: input.location,
      lat: input.lat,
      lng: input.lng,
    });
    const take = this.clampLimit(input.limit);
    const pool = Math.min(Math.max(take * 4, 20), 60);
    const filters: SearchFilters = {
      province: resolved?.code,
      categoryId: await this.categoryIdForSlug(input.categorySlug),
    };

    const query = input.query?.trim();
    let ids: number[];
    if (query) {
      ids = (await this.semanticIds(query, filters, pool)) ?? [];
      if (ids.length < take) {
        for (const id of await this.keywordIds(query, filters, pool)) {
          if (!ids.includes(id)) ids.push(id);
        }
      }
    } else {
      ids = await this.browseIds(filters, pool);
    }

    const suppliers = (await this.hydrate(ids, select, resolved?.code)).slice(0, take);
    return { province: resolved, suppliers };
  }

  private clampLimit(limit?: number | null): number {
    if (!limit || limit < 1) return DEFAULT_SEARCH_LIMIT;
    return Math.min(limit, MAX_SEARCH_LIMIT);
  }

  private validProvince(code?: string | null): string | undefined {
    return code && this.geoService.isProvinceCode(code) ? code.toUpperCase() : undefined;
  }

  private async categoryIdForSlug(slug?: string | null): Promise<number | undefined> {
    if (!slug) return undefined;
    const category = await this.prismaService.category.findUnique({
      where: { slug },
      select: { categoryId: true },
    });
    return category?.categoryId;
  }

  private baseWhere(filters: SearchFilters): Prisma.SupplierWhereInput {
    return {
      deletedAt: null,
      AND: [
        HAS_CONTACT_WHERE,
        ...(filters.province ? [{ serviceProvinces: { has: filters.province } }] : []),
        ...(filters.categoryId ? [{ categories: { some: { categoryId: filters.categoryId } } }] : []),
      ],
    };
  }

  private async browseIds(filters: SearchFilters, take: number): Promise<number[]> {
    const rows = await this.prismaService.supplier.findMany({
      where: this.baseWhere(filters),
      orderBy: [
        { preferredAt: { sort: 'desc', nulls: 'last' } },
        { verifiedAt: { sort: 'desc', nulls: 'last' } },
        { rating: { sort: 'desc', nulls: 'last' } },
        { reviewCount: 'desc' },
      ],
      take,
      select: { supplierId: true },
    });
    return rows.map((r) => r.supplierId);
  }

  /** Literal token match — needs no embeddings, so it always works. */
  private async keywordIds(query: string, filters: SearchFilters, take: number): Promise<number[]> {
    const tokens = query
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter((t) => t.length >= 3);
    const terms = tokens.length > 0 ? tokens : [query];

    const clauses: Prisma.SupplierWhereInput[] = terms.flatMap((q) => [
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
                { nameEs: { contains: q, mode: 'insensitive' as const } },
                { nameEn: { contains: q, mode: 'insensitive' as const } },
                { slug: { contains: q.toLowerCase() } },
              ],
            },
          },
        },
      },
    ]);

    // Array filters only match whole elements ("dj" would miss "wedding dj").
    const skillRows = await this.prismaService.$queryRawUnsafe<{ supplier_id: number }[]>(
      `SELECT supplier_id FROM supplier
        WHERE deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM unnest(skills) AS skill WHERE skill ILIKE ANY ($1::text[]))`,
      terms.map((t) => `%${t.toLowerCase()}%`),
    );
    if (skillRows.length > 0) {
      clauses.push({ supplierId: { in: skillRows.map((r) => r.supplier_id) } });
    }

    const base = this.baseWhere(filters);
    const rows = await this.prismaService.supplier.findMany({
      where: { ...base, AND: [...(base.AND as Prisma.SupplierWhereInput[]), { OR: clauses }] },
      orderBy: [
        { verifiedAt: { sort: 'desc', nulls: 'last' } },
        { rating: { sort: 'desc', nulls: 'last' } },
        { reviewCount: 'desc' },
      ],
      take,
      select: { supplierId: true },
    });
    return rows.map((r) => r.supplierId);
  }

  /**
   * Supplier ids by cosine similarity, or null when semantic search can't
   * run (embeddings disabled or the embed call failed).
   *
   * SUPPLIER_SEMANTIC_MAX_DISTANCE (default 0.65) is the cut-off: measured
   * on the seeded catalogue, correct matches land at 0.42–0.65 and unrelated
   * suppliers start around 0.75.
   */
  private async semanticIds(query: string, filters: SearchFilters, take: number): Promise<number[] | null> {
    if (!this.embeddingService.isEnabled()) return null;

    let vector: number[];
    try {
      vector = await this.embeddingService.embed(query);
    } catch (err) {
      this.logger.warn(`Semantic search embed failed, using keywords: ${(err as Error).message}`);
      return null;
    }

    const conditions = ['deleted_at IS NULL', 'description_embedding IS NOT NULL', HAS_CONTACT_SQL];
    const params: unknown[] = [EmbeddingService.toVectorLiteral(vector)];
    if (filters.province) {
      params.push(filters.province);
      conditions.push(`$${params.length} = ANY(service_provinces)`);
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      conditions.push(
        `EXISTS (SELECT 1 FROM supplier_category sc WHERE sc.supplier_id = supplier.supplier_id AND sc.category_id = $${params.length})`,
      );
    }

    const maxDistance = Number(process.env.SUPPLIER_SEMANTIC_MAX_DISTANCE ?? 0.65);
    const rows = await this.prismaService.$queryRawUnsafe<{ supplier_id: number }[]>(
      `SELECT supplier_id FROM supplier
        WHERE ${conditions.join(' AND ')}
          AND (description_embedding <=> $1::vector) < ${maxDistance}
        ORDER BY description_embedding <=> $1::vector
        LIMIT ${Math.max(1, Math.floor(take))}`,
      ...params,
    );
    return rows.map((r) => r.supplier_id);
  }

  /** Load full rows for `ids` (keeping their order) and apply the final ranking. */
  private async hydrate(ids: number[], select: any, province?: string): Promise<Supplier[]> {
    if (ids.length === 0) return [];
    const merged: any = this.withRelationFilters({ ...(select ?? {}) });
    // Needed for ranking regardless of what the caller asked for.
    merged.supplierId = true;
    merged.province = true;
    merged.preferredAt = true;
    merged.preferredUntil = true;

    const rows = await this.prismaService.supplier.findMany({
      where: { supplierId: { in: ids } },
      select: merged,
    });
    const byId = new Map<number, any>(rows.map((r: any) => [r.supplierId, r]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    const now = Date.now();
    const score = (s: any) =>
      (SupplierService.isPreferredActive(s, now) ? 2 : 0) + (province && s.province === province ? 1 : 0);
    // Stable sort: equal scores keep relevance order.
    return ordered
      .map((s, i) => ({ s, i, k: score(s) }))
      .sort((a, b) => b.k - a.k || a.i - b.i)
      .map((x) => x.s as Supplier);
  }

  public static isPreferredActive(
    s: { preferredAt?: Date | null; preferredUntil?: Date | null },
    now: number = Date.now(),
  ): boolean {
    if (!s.preferredAt || new Date(s.preferredAt).getTime() > now) return false;
    return !s.preferredUntil || new Date(s.preferredUntil).getTime() > now;
  }

  // ── Writes (owner only) ─────────────────────────────────────────────

  public async updateMine(
    userId: number,
    data: SupplierUpdateInput,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    const supplierId = await this.supplierIdForUser(userId);
    const current = await this.prismaService.supplier.findUniqueOrThrow({
      where: { supplierId },
      select: { province: true, serviceProvinces: true },
    });

    // Omitted = leave alone; '' = clear it.
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === 'serviceProvinces' || key === 'province') continue;
      patch[key] = typeof value === 'string' ? value.trim() || null : value;
    }
    if (patch.companyName == null) delete patch.companyName;

    if (data.province !== undefined) {
      const province = data.province ? data.province.toUpperCase() : null;
      if (province && !this.geoService.isProvinceCode(province)) {
        throw new BadRequestException(`Unknown province ${data.province}`);
      }
      patch.province = province;
    }
    if (data.province !== undefined || data.serviceProvinces !== undefined) {
      const home = data.province !== undefined ? (patch.province as string | null) : current.province;
      patch.serviceProvinces = this.geoService.normalizeServiceProvinces(
        home,
        data.serviceProvinces ?? current.serviceProvinces,
      );
    }

    const result = await this.prismaService.supplier.update({
      where: { supplierId },
      data: patch,
      select: this.withRelationFilters(select),
    });

    if (EMBEDDING_SOURCE_FIELDS.some((f) => data[f] !== undefined)) this.scheduleEmbed(supplierId);
    return result as unknown as Supplier;
  }

  public async setCategories(
    userId: number,
    { categoryIds, primaryCategoryId }: SupplierCategoriesInput,
  ): Promise<boolean> {
    const supplierId = await this.supplierIdForUser(userId);
    const ids = [...new Set(categoryIds)].filter((id) => Number.isFinite(id));
    if (ids.length === 0) throw new BadRequestException('Pick at least one category');
    if (ids.length > MAX_SUPPLIER_CATEGORIES) {
      throw new BadRequestException(`Pick at most ${MAX_SUPPLIER_CATEGORIES} categories`);
    }

    const known = await this.prismaService.category.count({
      where: { categoryId: { in: ids }, active: true },
    });
    if (known !== ids.length) throw new BadRequestException('One of those categories does not exist');

    const primary = primaryCategoryId != null && ids.includes(primaryCategoryId) ? primaryCategoryId : ids[0];
    await this.prismaService.$transaction([
      this.prismaService.supplierCategory.deleteMany({ where: { supplierId } }),
      this.prismaService.supplierCategory.createMany({
        data: ids.map((categoryId) => ({ supplierId, categoryId, isPrimary: categoryId === primary })),
      }),
    ]);

    this.scheduleEmbed(supplierId);
    return true;
  }

  public async setSkills(userId: number, skills: string[]): Promise<string[]> {
    const supplierId = await this.supplierIdForUser(userId);
    const normalized = normalizeSkills(skills);
    await this.prismaService.supplier.update({ where: { supplierId }, data: { skills: normalized } });
    this.scheduleEmbed(supplierId);
    return normalized;
  }

  /** "Suggest with AI" on the profile form. Nothing is saved. */
  public async suggestSkills(userId: number): Promise<string[]> {
    const supplierId = await this.supplierIdForUser(userId);
    const supplier = await this.prismaService.supplier.findUniqueOrThrow({
      where: { supplierId },
      select: SEARCH_SOURCE_SELECT,
    });
    if (!hasSkillDraftMaterial(supplier)) {
      throw new BadRequestException('Add a description or some services first — the AI drafts skills from them');
    }
    return this.draftSkills(supplier);
  }

  public async deleteMedia(userId: number, mediaAssetId: number): Promise<boolean> {
    const supplierId = await this.supplierIdForUser(userId);
    const asset = await this.prismaService.mediaAsset.findUnique({
      where: { mediaAssetId },
      select: { supplierId: true, storageFileId: true },
    });
    if (!asset || asset.supplierId !== supplierId) throw new NotFoundException('Photo not found');

    await this.googleDriveService.deleteStoredFile(asset.storageFileId);
    await this.prismaService.mediaAsset.delete({ where: { mediaAssetId } });
    return true;
  }

  /** Position in the array becomes `displayOrder`; foreign ids are ignored. */
  public async reorderMedia(userId: number, mediaAssetIds: number[]): Promise<boolean> {
    const supplierId = await this.supplierIdForUser(userId);
    const owned = new Set(
      (
        await this.prismaService.mediaAsset.findMany({
          where: { supplierId },
          select: { mediaAssetId: true },
        })
      ).map((a) => a.mediaAssetId),
    );
    const ordered = mediaAssetIds.filter((id) => owned.has(id));
    if (ordered.length === 0) return true;

    await this.prismaService.$transaction(
      ordered.map((mediaAssetId, index) =>
        this.prismaService.mediaAsset.update({ where: { mediaAssetId }, data: { displayOrder: index } }),
      ),
    );
    return true;
  }

  /** Contacts and reviews, for the supplier's own page. */
  public async statsFor(userId: number): Promise<SupplierStats> {
    const supplierId = await this.supplierIdForUser(userId);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [last30, total, byChannel, supplier] = await Promise.all([
      this.prismaService.contactEvent.count({ where: { supplierId, createdAt: { gte: since } } }),
      this.prismaService.contactEvent.count({ where: { supplierId } }),
      this.prismaService.contactEvent.groupBy({
        by: ['channel'],
        where: { supplierId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prismaService.supplier.findUniqueOrThrow({
        where: { supplierId },
        select: { rating: true, reviewCount: true },
      }),
    ]);
    return {
      contactsLast30Days: last30,
      contactsTotal: total,
      contactsByChannel: byChannel.map((c) => ({ channel: c.channel, count: c._count._all })),
      reviewCount: supplier.reviewCount,
      rating: supplier.rating?.toString() ?? null,
    };
  }

  public async companyNameExists(companyName: string): Promise<boolean> {
    const found = await this.prismaService.supplier.findFirst({
      where: { companyName: { equals: companyName.trim(), mode: 'insensitive' }, deletedAt: null },
      select: { supplierId: true },
    });
    return !!found;
  }

  // ── Search data (skills draft + embedding) ──────────────────────────

  /**
   * Fire-and-forget refresh after a profile change: draft skills with the
   * AI while the list is empty, then re-embed. Never blocks or fails the
   * write — a missing key or a provider outage just leaves the old vector.
   */
  public scheduleEmbed(supplierId: number): void {
    void this.refreshSearchData(supplierId).catch((err) => {
      this.logger.warn(`Supplier embed failed for supplierId=${supplierId}: ${(err as Error).message}`);
    });
  }

  public async refreshSearchData(supplierId: number): Promise<void> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { supplierId },
      select: SEARCH_SOURCE_SELECT,
    });
    if (!supplier) return;

    if (supplier.skills.length === 0 && hasSkillDraftMaterial(supplier)) {
      try {
        const drafted = await this.draftSkills(supplier);
        if (drafted.length > 0) {
          // Only if still empty — the supplier may have saved their own meanwhile.
          const { count } = await this.prismaService.supplier.updateMany({
            where: { supplierId, skills: { isEmpty: true } },
            data: { skills: drafted },
          });
          if (count > 0) supplier.skills = drafted;
        }
      } catch (err) {
        this.logger.warn(`Skill draft failed for supplierId=${supplierId}: ${(err as Error).message}`);
      }
    }

    if (!this.embeddingService.isEnabled()) return;
    const vector = await this.embeddingService.embed(buildSupplierEmbeddingText(supplier));
    await this.prismaService.$executeRawUnsafe(
      'UPDATE supplier SET description_embedding = $1::vector WHERE supplier_id = $2',
      EmbeddingService.toVectorLiteral(vector),
      supplierId,
    );
  }

  private async draftSkills(supplier: SkillDraftSource): Promise<string[]> {
    const res = await this.chatService.send({
      system: SKILL_DRAFT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildSkillDraftPrompt(supplier) }],
    });
    return parseSkillDraft(res.content);
  }
}
