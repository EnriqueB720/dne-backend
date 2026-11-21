import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, PromotionTier, Role } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { LeadService } from '../lead/lead.service';
import { TopSupplierByLeadsRow } from '../lead/model';
import {
  AdminStats,
  AiUsageBreakdownRow,
  MrrByDayRow,
  RevenueByDayRow,
  SupplierPromotionResult,
  TopSupplierRow,
} from './model';
import { SetSupplierPromotionInput } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly leadService: LeadService,
  ) {}

  /**
   * Demo-grade auth check until the auth track lands resolver-level guards.
   * Looks up the caller and rejects unless `isAdmin = true` (or legacy
   * `role = ADMIN`). Every admin-only method calls this first.
   */
  private async assertAdmin(userId: number): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { userId },
      select: { isAdmin: true, role: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new ForbiddenException('Admin access required');
    }
    if (!user.isAdmin && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * Active (ACTIVE/TRIALING) paid-plan subscriptions, one row per supplier
   * they cover, with the plan's monthly price. Shared by `getStats`'
   * mrr/paidSupplierCount and `getMrrByDay`.
   */
  private async getActivePaidSupplierSubscriptions(): Promise<
    Array<{ price: number; startDate: Date; endDate: Date }>
  > {
    const suppliers = await this.prismaService.supplier.findMany({
      where: {
        deletedAt: null,
        subscription: {
          status: { in: ['ACTIVE', 'TRIALING'] },
          plan: { price: { gt: 0 } },
        },
      },
      select: {
        subscription: {
          select: {
            startDate: true,
            endDate: true,
            plan: { select: { price: true, priceMonthly: true } },
          },
        },
      },
    });

    return suppliers
      .filter((s) => !!s.subscription)
      .map((s) => ({
        price: Number(s.subscription!.plan.priceMonthly ?? s.subscription!.plan.price),
        startDate: s.subscription!.startDate,
        endDate: s.subscription!.endDate,
      }));
  }

  public async getStats(adminUserId: number): Promise<AdminStats> {
    await this.assertAdmin(adminUserId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalCustomers,
      totalSuppliers,
      totalBookings,
      mtd,
      allTime,
      leadTotals,
      paidSubscriptions,
      subscribedSupplierCount,
    ] = await Promise.all([
      this.prismaService.user.count({ where: { deletedAt: null } }),
      this.prismaService.customer.count(),
      this.prismaService.supplier.count({ where: { deletedAt: null } }),
      this.prismaService.booking.count(),
      this.prismaService.booking.aggregate({
        _sum: { platformFee: true },
        where: {
          createdAt: { gte: monthStart },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      }),
      this.prismaService.booking.aggregate({
        _sum: { platformFee: true },
        where: {
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      }),
      this.leadService.getLeadTotals(),
      this.getActivePaidSupplierSubscriptions(),
      this.prismaService.supplier.count({
        where: { deletedAt: null, subscriptionId: { not: null } },
      }),
    ]);

    const mrr = paidSubscriptions.reduce((sum, s) => sum + s.price, 0);
    const paidSupplierCount = paidSubscriptions.length;
    const freeToPaidConversionRate =
      subscribedSupplierCount > 0
        ? Math.round((paidSupplierCount / subscribedSupplierCount) * 1000) / 10
        : 0;

    return {
      totalUsers,
      totalCustomers,
      totalSuppliers,
      totalBookings,
      mtdRevenue: (mtd._sum.platformFee ?? 0).toString(),
      allTimeRevenue: (allTime._sum.platformFee ?? 0).toString(),
      currency: 'CRC',
      totalLeads: leadTotals.totalLeads,
      leadsThisMonth: leadTotals.leadsThisMonth,
      mrr: mrr.toFixed(2),
      paidSupplierCount,
      freeToPaidConversionRate,
    };
  }

  public async getMrrByDay(adminUserId: number, daysBack = 30): Promise<MrrByDayRow[]> {
    await this.assertAdmin(adminUserId);

    const windowDays = Math.min(Math.max(daysBack, 1), 365);
    const now = new Date();
    const startUtc = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (windowDays - 1),
      ),
    );

    const subscriptions = await this.getActivePaidSupplierSubscriptions();

    const buckets = new Map<string, { mrr: number; count: number }>();
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(startUtc);
      d.setUTCDate(startUtc.getUTCDate() + i);
      buckets.set(d.toISOString().slice(0, 10), { mrr: 0, count: 0 });
    }

    for (const [day, cell] of buckets) {
      const dayDate = new Date(`${day}T00:00:00.000Z`);
      for (const s of subscriptions) {
        if (s.startDate <= dayDate && s.endDate >= dayDate) {
          cell.mrr += s.price;
          cell.count += 1;
        }
      }
    }

    return Array.from(buckets.entries()).map(([day, v]) => ({
      day,
      mrr: v.mrr.toFixed(2),
      paidSupplierCount: v.count,
    }));
  }

  public async getTopSuppliersByLeads(
    adminUserId: number,
    limit = 10,
  ): Promise<TopSupplierByLeadsRow[]> {
    await this.assertAdmin(adminUserId);
    return await this.leadService.getTopSuppliersByLeads(limit);
  }

  public async getTopSuppliers(
    adminUserId: number,
    limit = 10,
  ): Promise<TopSupplierRow[]> {
    await this.assertAdmin(adminUserId);

    const rows = await this.prismaService.supplier.findMany({
      where: { deletedAt: null },
      select: {
        supplierId: true,
        companyName: true,
        city: true,
        rating: true,
        _count: { select: { bookings: true, quotes: true } },
        bookings: {
          select: { totalPrice: true },
          where: {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          },
        },
      },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return rows
      .map((s) => {
        const gross = s.bookings.reduce(
          (acc, b) => acc + Number(b.totalPrice),
          0,
        );
        return {
          supplierId: s.supplierId,
          companyName: s.companyName,
          city: s.city ?? undefined,
          bookingCount: s._count.bookings,
          quoteCount: s._count.quotes,
          grossRevenue: gross.toFixed(2),
          rating: s.rating?.toString(),
        };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, limit);
  }

  public async getAiUsageBreakdown(
    adminUserId: number,
    daysBack = 30,
  ): Promise<AiUsageBreakdownRow[]> {
    await this.assertAdmin(adminUserId);

    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const grouped = await this.prismaService.aiUsageLog.groupBy({
      by: ['modelName'],
      where: { createdAt: { gte: since } },
      _count: { aiUsageLogId: true },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    });

    return grouped
      .map((g) => ({
        modelName: g.modelName,
        requests: g._count.aiUsageLogId,
        inputTokens: g._sum.inputTokens ?? 0,
        outputTokens: g._sum.outputTokens ?? 0,
        costUsd: (g._sum.costUsd ?? 0).toString(),
      }))
      .sort((a, b) => b.requests - a.requests);
  }

  public async getRevenueByDay(
    adminUserId: number,
    daysBack = 30,
  ): Promise<RevenueByDayRow[]> {
    await this.assertAdmin(adminUserId);

    const windowDays = Math.min(Math.max(daysBack, 1), 365);
    const now = new Date();
    // Start-of-day (UTC) for "today − (windowDays − 1)" so the result
    // includes today as the last bucket.
    const startUtc = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (windowDays - 1),
      ),
    );

    const bookings = await this.prismaService.booking.findMany({
      where: {
        createdAt: { gte: startUtc },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      select: { createdAt: true, platformFee: true },
    });

    // Pre-seed every day in the window with zeros so the chart renders a
    // continuous strip even when there are gaps.
    const buckets = new Map<string, { fee: number; count: number }>();
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(startUtc);
      d.setUTCDate(startUtc.getUTCDate() + i);
      buckets.set(d.toISOString().slice(0, 10), { fee: 0, count: 0 });
    }

    for (const b of bookings) {
      const key = b.createdAt.toISOString().slice(0, 10);
      const cell = buckets.get(key);
      if (!cell) continue;
      cell.fee += Number(b.platformFee);
      cell.count += 1;
    }

    return Array.from(buckets.entries()).map(([day, v]) => ({
      day,
      platformFee: v.fee.toFixed(2),
      bookings: v.count,
    }));
  }

  public async setSupplierPromotion(
    input: SetSupplierPromotionInput,
  ): Promise<SupplierPromotionResult> {
    await this.assertAdmin(input.adminUserId);

    const exists = await this.prismaService.supplier.findUnique({
      where: { supplierId: input.supplierId },
      select: { supplierId: true },
    });
    if (!exists) {
      throw new NotFoundException('Supplier not found');
    }

    const clearing = input.tier === PromotionTier.NONE;
    const updated = await this.prismaService.supplier.update({
      where: { supplierId: input.supplierId },
      data: {
        promotionTier: input.tier,
        promotionStartDate: clearing
          ? null
          : input.startDate ?? new Date(),
        promotionEndDate: clearing ? null : input.endDate ?? null,
      },
      select: {
        supplierId: true,
        promotionTier: true,
        promotionStartDate: true,
        promotionEndDate: true,
      },
    });

    return {
      supplierId: updated.supplierId,
      promotionTier: updated.promotionTier,
      promotionStartDate: updated.promotionStartDate ?? undefined,
      promotionEndDate: updated.promotionEndDate ?? undefined,
    };
  }
}
