import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactChannel, Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { GeoService } from '../../shared/geo';
import { SupplierService } from '../supplier/supplier.service';
import { AdminPreferredInput, AdminSupplierFilter, AdminSupplierStatus } from './dto/admin.input';
import { AdminOverview, AdminSupplierPage, AdminSupplierRow } from './model/admin.model';

const DAY_MS = 24 * 60 * 60 * 1000;

const CHANNEL_LABELS: Record<ContactChannel, string> = {
  CHAT_CONTACT: 'Chat',
  PHONE: 'Phone',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  WEBSITE: 'Website',
};

/** Callers are already checked by AdminGuard (see AdminResolver). */
@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly geoService: GeoService,
  ) {}

  /**
   * Everything the admin dashboard shows, for the last `days` days:
   * supplier sign-ups ("new supplier incomes"), customer sign-ups and
   * customer → supplier contacts, plus where suppliers are and who gets
   * contacted most.
   */
  public async overview(daysInput = 30): Promise<AdminOverview> {
    const days = Math.min(Math.max(Math.floor(daysInput), 1), 365);
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
    const p = this.prismaService;

    const [
      suppliers,
      verified,
      preferred,
      customers,
      newSupplierRows,
      newCustomerRows,
      contactRows,
      chats,
      byChannel,
      byProvince,
      topRaw,
    ] = await Promise.all([
      p.supplier.count({ where: { deletedAt: null } }),
      p.supplier.count({ where: { deletedAt: null, verifiedAt: { not: null } } }),
      p.supplier.count({
        where: {
          deletedAt: null,
          preferredAt: { lte: now },
          OR: [{ preferredUntil: null }, { preferredUntil: { gt: now } }],
        },
      }),
      p.customer.count(),
      p.supplier.findMany({ where: { deletedAt: null, createdAt: { gte: start } }, select: { createdAt: true } }),
      p.customer.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
      p.contactEvent.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true, customerId: true, deviceId: true },
      }),
      p.aiConversation.count({ where: { createdAt: { gte: start } } }),
      p.contactEvent.groupBy({ by: ['channel'], where: { createdAt: { gte: start } }, _count: { _all: true } }),
      p.supplier.groupBy({ by: ['province'], where: { deletedAt: null }, _count: { _all: true } }),
      p.contactEvent.groupBy({
        by: ['supplierId'],
        where: { createdAt: { gte: start } },
        _count: { _all: true },
        orderBy: { _count: { supplierId: 'desc' } },
        take: 10,
      }),
    ]);

    // Continuous daily series so charts have no gaps.
    const daily = new Map<string, { newSuppliers: number; newCustomers: number; contacts: number }>();
    for (let i = 0; i < days; i++) {
      daily.set(new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10), {
        newSuppliers: 0,
        newCustomers: 0,
        contacts: 0,
      });
    }
    const bump = (d: Date, key: 'newSuppliers' | 'newCustomers' | 'contacts') => {
      const cell = daily.get(d.toISOString().slice(0, 10));
      if (cell) cell[key] += 1;
    };
    newSupplierRows.forEach((r) => bump(r.createdAt, 'newSuppliers'));
    newCustomerRows.forEach((r) => bump(r.createdAt, 'newCustomers'));
    contactRows.forEach((r) => bump(r.createdAt, 'contacts'));

    const contacters = new Set(
      contactRows.map((r) => (r.customerId != null ? `c${r.customerId}` : `d${r.deviceId ?? ''}`)),
    );

    const topSuppliers = await p.supplier.findMany({
      where: { supplierId: { in: topRaw.map((t) => t.supplierId) } },
      select: { supplierId: true, companyName: true, province: true, rating: true },
    });
    const topById = new Map(topSuppliers.map((s) => [s.supplierId, s]));

    return {
      days,
      totals: {
        suppliers,
        verifiedSuppliers: verified,
        pendingVerification: suppliers - verified,
        preferredSuppliers: preferred,
        customers,
        newSuppliers: newSupplierRows.length,
        newCustomers: newCustomerRows.length,
        contacts: contactRows.length,
        uniqueContacters: contacters.size,
        chats,
      },
      daily: [...daily.entries()].map(([day, v]) => ({ day, ...v })),
      contactsByChannel: byChannel
        .map((c) => ({ key: c.channel, label: CHANNEL_LABELS[c.channel], count: c._count._all }))
        .sort((a, b) => b.count - a.count),
      suppliersByProvince: byProvince
        .map((g) => ({
          key: g.province ?? 'none',
          label: this.geoService.provinceName(g.province) ?? '—',
          count: g._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      topSuppliers: topRaw
        .map((t) => {
          const s = topById.get(t.supplierId);
          return s
            ? {
                supplierId: s.supplierId,
                companyName: s.companyName,
                provinceName: this.geoService.provinceName(s.province) ?? undefined,
                contacts: t._count._all,
                rating: s.rating?.toString(),
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    };
  }

  /** Paged supplier table for the Verification and Preferred pages. */
  public async suppliers(filter: AdminSupplierFilter = {}): Promise<AdminSupplierPage> {
    const now = new Date();
    const and: Prisma.SupplierWhereInput[] = [{ deletedAt: null }];

    const search = filter.search?.trim();
    if (search) {
      and.push({
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    if (filter.province) and.push({ province: filter.province.toUpperCase() });
    switch (filter.status) {
      case AdminSupplierStatus.UNVERIFIED:
        and.push({ verifiedAt: null });
        break;
      case AdminSupplierStatus.VERIFIED:
        and.push({ verifiedAt: { not: null } });
        break;
      case AdminSupplierStatus.PREFERRED:
        and.push({ preferredAt: { lte: now } }, { OR: [{ preferredUntil: null }, { preferredUntil: { gt: now } }] });
        break;
    }

    const where: Prisma.SupplierWhereInput = { AND: and };
    const take = Math.min(Math.max(filter.limit ?? 25, 1), 100);
    const skip = Math.max(filter.offset ?? 0, 0);
    const since = new Date(now.getTime() - 30 * DAY_MS);

    const [total, rows] = await Promise.all([
      this.prismaService.supplier.count({ where }),
      this.prismaService.supplier.findMany({
        where,
        // Oldest pending first is the natural verification queue order.
        orderBy:
          filter.status === AdminSupplierStatus.UNVERIFIED ? [{ createdAt: 'asc' }] : [{ createdAt: 'desc' }],
        take,
        skip,
        select: {
          supplierId: true,
          companyName: true,
          tagline: true,
          description: true,
          city: true,
          province: true,
          businessPhone: true,
          whatsappNumber: true,
          businessEmail: true,
          websiteUrl: true,
          source: true,
          verifiedAt: true,
          preferredAt: true,
          preferredUntil: true,
          rating: true,
          reviewCount: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          categories: { select: { category: { select: { nameEs: true } } } },
          _count: { select: { contactEvents: { where: { createdAt: { gte: since } } } } },
        },
      }),
    ]);

    return {
      total,
      rows: rows.map(
        (s): AdminSupplierRow => ({
          supplierId: s.supplierId,
          companyName: s.companyName,
          tagline: s.tagline ?? undefined,
          description: s.description ?? undefined,
          city: s.city ?? undefined,
          province: s.province ?? undefined,
          provinceName: this.geoService.provinceName(s.province) ?? undefined,
          categories: s.categories.map((c) => c.category.nameEs),
          businessPhone: s.businessPhone ?? undefined,
          whatsappNumber: s.whatsappNumber ?? undefined,
          businessEmail: s.businessEmail ?? undefined,
          websiteUrl: s.websiteUrl ?? undefined,
          ownerName: s.user.name,
          ownerEmail: s.user.email,
          source: s.source,
          verifiedAt: s.verifiedAt ?? undefined,
          preferredAt: s.preferredAt ?? undefined,
          preferredUntil: s.preferredUntil ?? undefined,
          preferred: SupplierService.isPreferredActive(s, now.getTime()),
          rating: s.rating?.toString(),
          reviewCount: s.reviewCount,
          contactsLast30Days: s._count.contactEvents,
          createdAt: s.createdAt,
        }),
      ),
    };
  }

  public async setVerified(supplierId: number, verified: boolean): Promise<boolean> {
    await this.assertExists(supplierId);
    await this.prismaService.supplier.update({
      where: { supplierId },
      data: { verifiedAt: verified ? new Date() : null },
    });
    return true;
  }

  public async setPreferred({ supplierId, preferred, until }: AdminPreferredInput): Promise<boolean> {
    await this.assertExists(supplierId);
    await this.prismaService.supplier.update({
      where: { supplierId },
      data: preferred
        ? { preferredAt: new Date(), preferredUntil: until ?? null }
        : { preferredAt: null, preferredUntil: null },
    });
    return true;
  }

  private async assertExists(supplierId: number): Promise<void> {
    const found = await this.prismaService.supplier.findFirst({
      where: { supplierId, deletedAt: null },
      select: { supplierId: true },
    });
    if (!found) throw new NotFoundException('Supplier not found');
  }
}
