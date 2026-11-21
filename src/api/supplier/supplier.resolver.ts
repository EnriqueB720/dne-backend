import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser, GraphQLFields, IGraphQLFields } from '@decorators';
import { GeoService } from '../../shared/geo';
import { JwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';
import { SupplierCategoriesInput, SupplierSearchInput, SupplierUpdateInput } from './dto';
import { Supplier, SupplierSearchResult, SupplierSelect, SupplierStats } from './model';
import { SupplierService } from './supplier.service';

@Resolver(() => Supplier)
export class SupplierResolver {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly geoService: GeoService,
  ) {}

  // ── Public ──────────────────────────────────────────────────────────

  /** Public profile page (/providers/[id]). */
  @Query(() => Supplier)
  public async supplier(
    @Args('supplierId', { type: () => Int }) supplierId: number,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier> {
    return this.supplierService.findPublic(supplierId, fields);
  }

  /** Browse list (empty chat screen). Optional province filter. */
  @Query(() => [Supplier])
  public async suppliers(
    @Args('province', { nullable: true }) province: string,
    @Args('limit', { type: () => Int, nullable: true }) limit: number,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier[]> {
    return this.supplierService.list({ province, limit }, fields);
  }

  /** The AI chat's supplier lookup — see SupplierService.search. */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Query(() => SupplierSearchResult)
  public async searchSuppliers(
    @Args('data') data: SupplierSearchInput,
    @GraphQLFields() { fields }: IGraphQLFields<{ select?: { suppliers?: SupplierSelect } }>,
  ): Promise<SupplierSearchResult> {
    return this.supplierService.search(data, fields.select?.suppliers ?? { select: { supplierId: true } });
  }

  // ── Signed-in supplier ──────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Query(() => Supplier)
  public async mySupplier(
    @CurrentUser() user: IAuthUser,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier> {
    return this.supplierService.findMine(Number(user.sub), fields);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => SupplierStats)
  public async mySupplierStats(@CurrentUser() user: IAuthUser): Promise<SupplierStats> {
    return this.supplierService.statsFor(Number(user.sub));
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Supplier)
  public async updateMySupplier(
    @Args('data') data: SupplierUpdateInput,
    @CurrentUser() user: IAuthUser,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier> {
    return this.supplierService.updateMine(Number(user.sub), data, fields);
  }

  /** Full replace of the supplier's categories (1–5). */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  public async setMySupplierCategories(
    @Args('data') data: SupplierCategoriesInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.supplierService.setCategories(Number(user.sub), data);
  }

  /** Full replace of the supplier's skills; returns them normalized. */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => [String])
  public async setMySupplierSkills(
    @Args('skills', { type: () => [String] }) skills: string[],
    @CurrentUser() user: IAuthUser,
  ): Promise<string[]> {
    return this.supplierService.setSkills(Number(user.sub), skills);
  }

  /** AI-drafted skills from the profile. Read-only; each call is a model completion. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Query(() => [String])
  public async suggestMySupplierSkills(@CurrentUser() user: IAuthUser): Promise<string[]> {
    return this.supplierService.suggestSkills(Number(user.sub));
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  public async deleteMySupplierMedia(
    @Args('mediaAssetId', { type: () => Int }) mediaAssetId: number,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.supplierService.deleteMedia(Number(user.sub), mediaAssetId);
  }

  /** Index 0 becomes the cover photo. */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  public async reorderMySupplierMedia(
    @Args('mediaAssetIds', { type: () => [Int] }) mediaAssetIds: number[],
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.supplierService.reorderMedia(Number(user.sub), mediaAssetIds);
  }

  // ── Computed fields (inputs mapped in shared/decorators/graphql-fields.ts) ──

  @ResolveField(() => Boolean)
  verified(@Parent() s: Supplier): boolean {
    return !!s.verifiedAt;
  }

  /** Admin-pinned to the top of results, and not expired. */
  @ResolveField(() => Boolean)
  preferred(@Parent() s: Supplier): boolean {
    return SupplierService.isPreferredActive(s);
  }

  @ResolveField(() => String, { nullable: true })
  provinceName(@Parent() s: Supplier): string | null {
    return this.geoService.provinceName(s.province);
  }

  @ResolveField(() => [String])
  serviceProvinceNames(@Parent() s: Supplier): string[] {
    return (s.serviceProvinces ?? [])
      .map((code) => this.geoService.provinceName(code))
      .filter((n): n is string => !!n);
  }
}
