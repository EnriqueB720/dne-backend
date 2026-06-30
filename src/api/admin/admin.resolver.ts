import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AdminService } from './admin.service';
import {
  AdminStats,
  AiUsageBreakdownRow,
  RevenueByDayRow,
  SupplierPromotionResult,
  TopSupplierRow,
} from './model';
import {
  AdminStatsArgs,
  AiUsageBreakdownArgs,
  RevenueByDayArgs,
  SetSupplierPromotionInput,
  TopSuppliersArgs,
} from './dto';

/**
 * Admin-only GraphQL surface. Each method passes `adminUserId` through to
 * the service, which verifies the caller is actually an admin before
 * returning anything (see `AdminService.assertAdmin`). When the auth-track
 * lands resolver-level guards, the `adminUserId` arg should be replaced with
 * an extraction from the authenticated GraphQL context.
 */
@Resolver()
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  @Query(() => AdminStats)
  public async adminStats(@Args() args: AdminStatsArgs): Promise<AdminStats> {
    return await this.adminService.getStats(args.adminUserId);
  }

  @Query(() => [TopSupplierRow])
  public async topSuppliers(
    @Args() args: TopSuppliersArgs,
  ): Promise<TopSupplierRow[]> {
    return await this.adminService.getTopSuppliers(args.adminUserId, args.limit);
  }

  @Query(() => [AiUsageBreakdownRow])
  public async aiUsageBreakdown(
    @Args() args: AiUsageBreakdownArgs,
  ): Promise<AiUsageBreakdownRow[]> {
    return await this.adminService.getAiUsageBreakdown(
      args.adminUserId,
      args.daysBack,
    );
  }

  @Query(() => [RevenueByDayRow])
  public async revenueByDay(
    @Args() args: RevenueByDayArgs,
  ): Promise<RevenueByDayRow[]> {
    return await this.adminService.getRevenueByDay(args.adminUserId, args.daysBack);
  }

  @Mutation(() => SupplierPromotionResult)
  public async setSupplierPromotion(
    @Args('data') data: SetSupplierPromotionInput,
  ): Promise<SupplierPromotionResult> {
    return await this.adminService.setSupplierPromotion(data);
  }
}
