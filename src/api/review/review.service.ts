import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { NotificationService } from '../notification/notification.service';
import { Review, ReviewSelect } from '../supplier/model';
import { ReviewCreateInput, ReviewDeleteInput, ReviewUpdateInput } from './dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private assertRatingsInRange(
    ratings: Array<[string, number | undefined]>,
  ): void {
    for (const [label, value] of ratings) {
      if (value != null && (value < 1 || value > 5)) {
        throw new BadRequestException(`${label} must be between 1 and 5`);
      }
    }
  }

  /**
   * Recompute the supplier's denormalized `rating` / `reviewCount` from its
   * visible reviews. Runs inside whatever transaction the caller opened so
   * the aggregate never drifts from the review rows.
   */
  private async recomputeSupplierRating(
    tx: Prisma.TransactionClient,
    supplierId: number,
  ): Promise<void> {
    const stats = await tx.review.aggregate({
      where: { supplierId, hidden: false },
      _avg: { rating: true },
      _count: { reviewId: true },
    });
    await tx.supplier.update({
      where: { supplierId },
      data: {
        rating: stats._avg.rating,
        reviewCount: stats._count.reviewId,
      },
    });
  }

  /**
   * Customer leaves a review on a completed booking. One review per booking
   * (enforced both here and by the DB unique constraint).
   */
  public async create(
    data: ReviewCreateInput,
    { select }: ReviewSelect,
  ): Promise<Review> {
    const { bookingId, customerId, rating, text, ...subRatings } = data;

    this.assertRatingsInRange([
      ['rating', rating],
      ['ratingQuality', subRatings.ratingQuality],
      ['ratingCommunication', subRatings.ratingCommunication],
      ['ratingValue', subRatings.ratingValue],
      ['ratingPunctuality', subRatings.ratingPunctuality],
    ]);

    const booking = await this.prismaService.booking.findUnique({
      where: { bookingId },
      select: {
        customerId: true,
        supplierId: true,
        status: true,
        review: { select: { reviewId: true } },
        supplier: { select: { userId: true, companyName: true } },
        customer: { select: { user: { select: { name: true } } } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    if (booking.customerId !== customerId) {
      throw new BadRequestException('Only the customer on this booking can review it');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Reviews can only be left on completed bookings');
    }
    if (booking.review) {
      throw new ConflictException('This booking has already been reviewed');
    }

    const review = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId,
          customerId,
          supplierId: booking.supplierId,
          rating,
          text,
          ...subRatings,
        },
        select,
      });
      await this.recomputeSupplierRating(tx, booking.supplierId);
      return created;
    });

    // Best-effort: let the supplier know a review landed.
    void this.notificationService
      .emit({
        userId: booking.supplier.userId,
        template: 'REVIEW_RECEIVED',
        subject: 'You received a new review',
        body: `${booking.customer.user.name} left a ${rating}-star review on a completed booking.`,
        entityType: 'Booking',
        entityId: bookingId,
      })
      .catch(() => undefined);

    return review;
  }

  /**
   * Author edits their review. Full replace — the edit form sends every
   * field, so omitted optional ratings/text are cleared.
   */
  public async update(
    data: ReviewUpdateInput,
    { select }: ReviewSelect,
  ): Promise<Review> {
    const { reviewId, customerId, rating, text, ...subRatings } = data;

    this.assertRatingsInRange([
      ['rating', rating],
      ['ratingQuality', subRatings.ratingQuality],
      ['ratingCommunication', subRatings.ratingCommunication],
      ['ratingValue', subRatings.ratingValue],
      ['ratingPunctuality', subRatings.ratingPunctuality],
    ]);

    const existing = await this.prismaService.review.findUnique({
      where: { reviewId },
      select: { customerId: true, supplierId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }
    if (existing.customerId !== customerId) {
      throw new BadRequestException('Only the author can edit this review');
    }

    return await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { reviewId },
        data: {
          rating,
          text: text ?? null,
          ratingQuality: subRatings.ratingQuality ?? null,
          ratingCommunication: subRatings.ratingCommunication ?? null,
          ratingValue: subRatings.ratingValue ?? null,
          ratingPunctuality: subRatings.ratingPunctuality ?? null,
        },
        select,
      });
      await this.recomputeSupplierRating(tx, existing.supplierId);
      return updated;
    });
  }

  /** Author removes their review. Returns true on success. */
  public async delete({ reviewId, customerId }: ReviewDeleteInput): Promise<boolean> {
    const existing = await this.prismaService.review.findUnique({
      where: { reviewId },
      select: { customerId: true, supplierId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }
    if (existing.customerId !== customerId) {
      throw new BadRequestException('Only the author can delete this review');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.review.delete({ where: { reviewId } });
      await this.recomputeSupplierRating(tx, existing.supplierId);
    });

    return true;
  }
}
