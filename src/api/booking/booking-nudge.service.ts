import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { NotificationService } from '../notification/notification.service';

/** Sent to the customer when the service window has passed but the booking
 *  was never marked complete. */
const TEMPLATE_BOOKING_ENDED = 'BOOKING_ENDED_NUDGE';
/** Sent to the customer when a completed booking still has no review. */
const TEMPLATE_REVIEW_REMINDER = 'REVIEW_REMINDER';

/** Wait this long after completion before reminding about a missing review,
 *  so it doesn't stack on top of the immediate BOOKING_COMPLETED note. */
const REVIEW_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Periodic sweep that gently pushes bookings through the end of their
 * lifecycle: end date passed → "mark it complete", completed → "leave a
 * review". Each nudge is sent at most once per booking (deduped against the
 * notification table by template + entity).
 */
@Injectable()
export class BookingNudgeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BookingNudgeService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Run once on boot so nudges don't wait up to an hour after a deploy. */
  public onApplicationBootstrap(): void {
    void this.sweep().catch((err) =>
      this.logger.warn(`Initial nudge sweep failed: ${err?.message ?? err}`),
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  public async sweep(): Promise<void> {
    await this.nudgeEndedBookings();
    await this.nudgeMissingReviews();
  }

  /** True if this user was already nudged with `template` for this booking. */
  private async alreadySent(
    userId: number,
    template: string,
    bookingId: number,
  ): Promise<boolean> {
    const existing = await this.prismaService.notification.findFirst({
      where: { userId, template, entityType: 'Booking', entityId: bookingId },
      select: { notificationId: true },
    });
    return existing !== null;
  }

  /**
   * Bookings whose service window (serviceEndDate, falling back to
   * serviceDate) is in the past but are still CONFIRMED / IN_PROGRESS —
   * nudge the customer to mark them complete and review.
   */
  private async nudgeEndedBookings(): Promise<void> {
    const now = new Date();
    const ended = await this.prismaService.booking.findMany({
      where: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        OR: [
          { serviceEndDate: { lt: now } },
          { serviceEndDate: null, serviceDate: { lt: now } },
        ],
      },
      select: {
        bookingId: true,
        supplier: { select: { companyName: true } },
        customer: { select: { user: { select: { userId: true } } } },
      },
      take: 200,
    });

    for (const booking of ended) {
      const userId = booking.customer.user.userId;
      if (await this.alreadySent(userId, TEMPLATE_BOOKING_ENDED, booking.bookingId)) {
        continue;
      }
      await this.notificationService.emit({
        userId,
        template: TEMPLATE_BOOKING_ENDED,
        subject: 'How did it go?',
        body: `Your booking with ${booking.supplier.companyName} has ended. Mark it complete and leave a review to help other customers ⭐`,
        entityType: 'Booking',
        entityId: booking.bookingId,
      });
    }
  }

  /**
   * Completed bookings older than the reminder delay that still have no
   * review — remind the customer once.
   */
  private async nudgeMissingReviews(): Promise<void> {
    const cutoff = new Date(Date.now() - REVIEW_REMINDER_DELAY_MS);
    const unreviewed = await this.prismaService.booking.findMany({
      where: {
        status: BookingStatus.COMPLETED,
        completedAt: { lt: cutoff },
        review: null,
      },
      select: {
        bookingId: true,
        supplier: { select: { companyName: true } },
        customer: { select: { user: { select: { userId: true } } } },
      },
      take: 200,
    });

    for (const booking of unreviewed) {
      const userId = booking.customer.user.userId;
      if (await this.alreadySent(userId, TEMPLATE_REVIEW_REMINDER, booking.bookingId)) {
        continue;
      }
      await this.notificationService.emit({
        userId,
        template: TEMPLATE_REVIEW_REMINDER,
        subject: 'Leave a review?',
        body: `Your booking with ${booking.supplier.companyName} is complete. A quick rating helps them — and future customers ⭐`,
        entityType: 'Booking',
        entityId: booking.bookingId,
      });
    }
  }
}
