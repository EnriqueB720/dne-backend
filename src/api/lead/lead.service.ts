import { Injectable } from '@nestjs/common';
import { LeadSource } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { LeadEventCreateInput } from './dto';
import { LeadEvent, TopSupplierByLeadsRow } from './model';

@Injectable()
export class LeadService {
  constructor(private readonly prismaService: PrismaService) {}

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  public async recordLead(data: LeadEventCreateInput): Promise<LeadEvent> {
    return await this.prismaService.leadEvent.create({
      data: {
        supplierId: data.supplierId,
        customerId: data.customerId ?? null,
        source: data.source ?? LeadSource.CHAT,
      },
    });
  }

  /** "Leads this month" + "leads all time" for one supplier's dashboard card. */
  public async getLeadStatsForSupplier(
    supplierId: number,
  ): Promise<{ leadsThisMonth: number; leadsAllTime: number }> {
    const [leadsThisMonth, leadsAllTime] = await Promise.all([
      this.prismaService.leadEvent.count({
        where: { supplierId, createdAt: { gte: this.startOfMonth() } },
      }),
      this.prismaService.leadEvent.count({ where: { supplierId } }),
    ]);
    return { leadsThisMonth, leadsAllTime };
  }

  /** Platform-wide lead volume for the admin dashboard. */
  public async getLeadTotals(): Promise<{ totalLeads: number; leadsThisMonth: number }> {
    const [totalLeads, leadsThisMonth] = await Promise.all([
      this.prismaService.leadEvent.count(),
      this.prismaService.leadEvent.count({ where: { createdAt: { gte: this.startOfMonth() } } }),
    ]);
    return { totalLeads, leadsThisMonth };
  }

  public async getTopSuppliersByLeads(limit = 10): Promise<TopSupplierByLeadsRow[]> {
    const take = Math.min(Math.max(limit, 1), 100);
    const grouped = await this.prismaService.leadEvent.groupBy({
      by: ['supplierId'],
      _count: { leadEventId: true },
      orderBy: { _count: { leadEventId: 'desc' } },
      take,
    });
    if (grouped.length === 0) return [];

    const suppliers = await this.prismaService.supplier.findMany({
      where: { supplierId: { in: grouped.map((g) => g.supplierId) } },
      select: { supplierId: true, companyName: true, city: true },
    });
    const byId = new Map(suppliers.map((s) => [s.supplierId, s]));

    return grouped
      .map((g): TopSupplierByLeadsRow | null => {
        const s = byId.get(g.supplierId);
        if (!s) return null;
        return {
          supplierId: s.supplierId,
          companyName: s.companyName,
          city: s.city ?? undefined,
          leadCount: g._count.leadEventId,
        };
      })
      .filter((row): row is TopSupplierByLeadsRow => row !== null);
  }
}
