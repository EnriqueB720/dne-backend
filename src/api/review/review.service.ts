import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { ReviewInput } from './dto';
import { ReviewView } from './model/review-view.model';

const REVIEW_VIEW_SELECT = {
  reviewId: true,
  supplierId: true,
  rating: true,
  text: true,
  createdAt: true,
  updatedAt: true,
  customerId: true,
  customer: { select: { user: { select: { name: true } } } },
} as const;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof REVIEW_VIEW_SELECT }>;

/** "Andrea Rojas" → "Andrea R." */
export function shortName(full: string | null | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Cliente';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

@Injectable()
export class ReviewService {
  constructor(private readonly prismaService: PrismaService) {}

  private toView(row: ReviewRow, myCustomerId: number | null): ReviewView {
    return {
      reviewId: row.reviewId,
      supplierId: row.supplierId,
      rating: row.rating,
      text: row.text ?? undefined,
      reviewerName: shortName(row.customer.user.name),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isMine: myCustomerId != null && row.customerId === myCustomerId,
    };
  }

  private async customerIdFor(userId: number | null): Promise<number | null> {
    if (userId == null) return null;
    const customer = await this.prismaService.customer.findUnique({
      where: { userId },
      select: { customerId: true },
    });
    return customer?.customerId ?? null;
  }

  /** Recompute the supplier's cached rating/reviewCount in the same transaction. */
  private async recomputeSupplierRating(tx: Prisma.TransactionClient, supplierId: number): Promise<void> {
    const stats = await tx.review.aggregate({
      where: { supplierId },
      _avg: { rating: true },
      _count: { reviewId: true },
    });
    await tx.supplier.update({
      where: { supplierId },
      data: { rating: stats._avg.rating, reviewCount: stats._count.reviewId },
    });
  }

  public async listForSupplier(supplierId: number, userId: number | null, limit = 50): Promise<ReviewView[]> {
    const myCustomerId = await this.customerIdFor(userId);
    const rows = await this.prismaService.review.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      select: REVIEW_VIEW_SELECT,
    });
    return rows.map((r) => this.toView(r, myCustomerId));
  }

  /**
   * Signed-in customer reviews a supplier (no booking needed). A second
   * submit replaces the first — one review per customer per supplier.
   */
  public async upsert(userId: number, input: ReviewInput): Promise<ReviewView> {
    const customerId = await this.customerIdFor(userId);
    if (customerId == null) {
      throw new BadRequestException('Only customer accounts can leave reviews');
    }

    const supplier = await this.prismaService.supplier.findFirst({
      where: { supplierId: input.supplierId, deletedAt: null },
      select: { userId: true },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (supplier.userId === userId) throw new BadRequestException("You can't review your own business");

    const text = input.text?.trim() || null;
    const row = await this.prismaService.$transaction(async (tx) => {
      const saved = await tx.review.upsert({
        where: { customerId_supplierId: { customerId, supplierId: input.supplierId } },
        create: { customerId, supplierId: input.supplierId, rating: input.rating, text },
        update: { rating: input.rating, text },
        select: REVIEW_VIEW_SELECT,
      });
      await this.recomputeSupplierRating(tx, input.supplierId);
      return saved;
    });

    // A review answers the "How did it go?" prompt for this supplier.
    await this.prismaService.contactEvent.updateMany({
      where: { customerId, supplierId: input.supplierId, reviewPromptDismissedAt: null },
      data: { reviewPromptDismissedAt: new Date() },
    });

    return this.toView(row, customerId);
  }

  public async remove(userId: number, reviewId: number): Promise<boolean> {
    const customerId = await this.customerIdFor(userId);
    const existing = await this.prismaService.review.findUnique({
      where: { reviewId },
      select: { customerId: true, supplierId: true },
    });
    if (!existing || existing.customerId !== customerId) throw new NotFoundException('Review not found');

    await this.prismaService.$transaction(async (tx) => {
      await tx.review.delete({ where: { reviewId } });
      await this.recomputeSupplierRating(tx, existing.supplierId);
    });
    return true;
  }
}
