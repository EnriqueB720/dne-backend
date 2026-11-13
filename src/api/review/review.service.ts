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
   * The reviewer is whoever is signed in. Supplier-only accounts have no
   * customer profile and can't review. `claimedCustomerId` is the optional
   * id the client sent — a mismatch means a stale or forged request.
   */
  private async resolveReviewer(
    userId: number,
    claimedCustomerId?: number,
  ): Promise<{ customerId: number; name: string }> {
    const customer = await this.prismaService.customer.findUnique({
      where: { userId },
      select: { customerId: true, user: { select: { name: true } } },
    });
    if (!customer) {
      throw new BadRequestException('Only customer accounts can leave reviews');
    }
    if (claimedCustomerId != null && claimedCustomerId !== customer.customerId) {
      throw new BadRequestException('You can only review as yourself');
    }
    return { customerId: customer.customerId, name: customer.user.name };
  }

  /**
   * Signed-in customer reviews a supplier. Storefront reviews (by
   * `supplierId`) need no booking — one per customer per supplier, edit to
   * change it. The legacy booking path (by `bookingId`) keeps its rules:
   * own booking, COMPLETED, one review per booking.
   */
  public async create(
    data: ReviewCreateInput,
    { select }: ReviewSelect,
    userId: number,
  ): Promise<Review> {
    const { bookingId, supplierId: inputSupplierId, customerId: claimedCustomerId, rating, text, ...subRatings } = data;

    this.assertRatingsInRange([
      ['rating', rating],
      ['ratingQuality', subRatings.ratingQuality],
      ['ratingCommunication', subRatings.ratingCommunication],
      ['ratingValue', subRatings.ratingValue],
      ['ratingPunctuality', subRatings.ratingPunctuality],
    ]);

    const reviewer = await this.resolveReviewer(userId, claimedCustomerId);

    let supplierId: number;
    if (bookingId != null) {
      const booking = await this.prismaService.booking.findUnique({
        where: { bookingId },
        select: {
          customerId: true,
          supplierId: true,
          status: true,
          review: { select: { reviewId: true } },
        },
      });
      if (!booking) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }
      if (booking.customerId !== reviewer.customerId) {
        throw new BadRequestException('Only the customer on this booking can review it');
      }
      if (booking.status !== BookingStatus.COMPLETED) {
        throw new BadRequestException('Reviews can only be left on completed bookings');
      }
      if (booking.review) {
        throw new ConflictException('This booking has already been reviewed');
      }
      if (inputSupplierId != null && inputSupplierId !== booking.supplierId) {
        throw new BadRequestException('That booking is with a different supplier');
      }
      supplierId = booking.supplierId;
    } else {
      if (inputSupplierId == null) {
        throw new BadRequestException('Say which supplier you are reviewing');
      }
      supplierId = inputSupplierId;

      // Not a DB constraint: customers who reviewed several bookings with
      // the same supplier before Phase 5 already have more than one.
      const existing = await this.prismaService.review.findFirst({
        where: { supplierId, customerId: reviewer.customerId },
        select: { reviewId: true },
      });
      if (existing) {
        throw new ConflictException(
          'You already reviewed this supplier — edit your review instead',
        );
      }
    }

    const supplier = await this.prismaService.supplier.findFirst({
      where: { supplierId, deletedAt: null },
      select: { userId: true },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }
    if (supplier.userId === userId) {
      throw new BadRequestException("You can't review your own business");
    }

    const review = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: bookingId ?? null,
          customerId: reviewer.customerId,
          supplierId,
          rating,
          text,
          ...subRatings,
        },
        select,
      });
      await this.recomputeSupplierRating(tx, supplierId);
      return created;
    });

    // Best-effort: let the supplier know a review landed.
    void this.notificationService
      .emit({
        userId: supplier.userId,
        template: 'REVIEW_RECEIVED',
        subject: 'You received a new review',
        body:
          bookingId != null
            ? `${reviewer.name} left a ${rating}-star review on a completed booking.`
            : `${reviewer.name} left a ${rating}-star review on your profile.`,
        entityType: bookingId != null ? 'Booking' : 'Supplier',
        entityId: bookingId ?? supplierId,
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
    userId: number,
  ): Promise<Review> {
    const { reviewId, customerId: claimedCustomerId, rating, text, ...subRatings } = data;

    this.assertRatingsInRange([
      ['rating', rating],
      ['ratingQuality', subRatings.ratingQuality],
      ['ratingCommunication', subRatings.ratingCommunication],
      ['ratingValue', subRatings.ratingValue],
      ['ratingPunctuality', subRatings.ratingPunctuality],
    ]);

    const { customerId } = await this.resolveReviewer(userId, claimedCustomerId);
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
  public async delete(
    { reviewId, customerId: claimedCustomerId }: ReviewDeleteInput,
    userId: number,
  ): Promise<boolean> {
    const { customerId } = await this.resolveReviewer(userId, claimedCustomerId);
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
