import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, EventStatus, RequestStatus } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';

import { PrismaService } from '@prisma-datasource';
import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import { NotificationService } from '../notification/notification.service';
import {
  BookingArgs,
  BookingCancelInput,
  BookingCompleteInput,
  BookingsByCustomerArgs,
  BookingsBySupplierArgs,
} from './dto';
import { Booking, BookingSelect } from './model';

/** PubSub channel for booking lifecycle events. */
export const BOOKING_EVENT_CHANNEL = 'BOOKING_EVENT';
export type BookingEventType = 'CREATED' | 'CANCELLED' | 'COMPLETED';

@Injectable()
export class BookingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  /**
   * Publish a booking lifecycle event so both customer and supplier views
   * can refetch in real time.
   */
  private async publishBookingEvent(
    eventType: BookingEventType,
    bookingId: number,
    customerId: number,
    supplierId: number,
  ): Promise<void> {
    void this.pubSub.publish(BOOKING_EVENT_CHANNEL, {
      bookingEvent: { eventType, bookingId },
      customerId,
      supplierId,
    });
  }

  public async findOne(
    { where }: BookingArgs,
    { select }: BookingSelect,
  ): Promise<Booking> {
    return await this.prismaService.booking.findFirst({
      where,
      select,
    });
  }

  public async findManyByCustomer(
    { customerId, status }: BookingsByCustomerArgs,
    { select }: BookingSelect,
  ): Promise<Booking[]> {
    return await this.prismaService.booking.findMany({
      where: { customerId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  public async findManyBySupplier(
    { supplierId, status }: BookingsBySupplierArgs,
    { select }: BookingSelect,
  ): Promise<Booking[]> {
    return await this.prismaService.booking.findMany({
      where: { supplierId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  public async cancel(
    { bookingId, reason, cancelledBy }: BookingCancelInput,
    { select }: BookingSelect,
  ): Promise<Booking> {
    const existing = await this.prismaService.booking.findUnique({
      where: { bookingId },
      select: {
        requestId: true,
        customerId: true,
        supplierId: true,
        customer: { select: { userId: true } },
        supplier: { select: { userId: true, companyName: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const booking = await this.prismaService.$transaction(async (tx) => {
      await tx.request.update({
        where: { requestId: existing.requestId },
        data: {
          status: RequestStatus.CLOSED,
          closedAt: new Date(),
          closedReason: `Booking cancelled${cancelledBy ? ` by ${cancelledBy.toLowerCase()}` : ''}${reason ? ` — ${reason}` : ''}`,
        },
      });

      // Cancel the supplier's calendar event for this booking
      await tx.calendarEvent.updateMany({
        where: { bookingId, status: { not: EventStatus.CANCELLED } },
        data: { status: EventStatus.CANCELLED },
      });

      return await tx.booking.update({
        where: { bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledBy,
        },
        select,
      });
    });

    // Notify the OTHER party. cancelledBy is 'CUSTOMER' or 'SUPPLIER'.
    void this.notifyCancellation(bookingId, existing, cancelledBy, reason);

    // Live event so both sides' /bookings lists update immediately.
    await this.publishBookingEvent(
      'CANCELLED',
      bookingId,
      existing.customerId,
      existing.supplierId,
    );

    return booking;
  }

  private async notifyCancellation(
    bookingId: number,
    booking: {
      customer: { userId: number };
      supplier: { userId: number; companyName: string };
    },
    cancelledBy: string | null | undefined,
    reason: string | null | undefined,
  ): Promise<void> {
    try {
      const recipient =
        cancelledBy === 'CUSTOMER' ? booking.supplier.userId : booking.customer.userId;
      const actor = cancelledBy === 'CUSTOMER' ? 'The customer' : booking.supplier.companyName;
      const reasonSuffix = reason ? ` Reason: "${reason}"` : '';
      await this.notificationService.emit({
        userId: recipient,
        template: 'BOOKING_CANCELLED',
        subject: 'A booking was cancelled',
        body: `${actor} cancelled the booking.${reasonSuffix}`,
        entityType: 'Booking',
        entityId: bookingId,
      });
    } catch {
      // best-effort
    }
  }

  public async complete(
    { bookingId }: BookingCompleteInput,
    { select }: BookingSelect,
  ): Promise<Booking> {
    const existing = await this.prismaService.booking.findUnique({
      where: { bookingId },
      select: {
        requestId: true,
        customerId: true,
        supplierId: true,
        customer: { select: { userId: true } },
        supplier: { select: { companyName: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const booking = await this.prismaService.$transaction(async (tx) => {
      await tx.request.update({
        where: { requestId: existing.requestId },
        data: {
          status: RequestStatus.CLOSED,
          closedAt: new Date(),
          closedReason: 'Service completed',
        },
      });

      // Mark the supplier's calendar event for this booking as completed
      await tx.calendarEvent.updateMany({
        where: { bookingId, status: { not: EventStatus.COMPLETED } },
        data: { status: EventStatus.COMPLETED },
      });

      return await tx.booking.update({
        where: { bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: new Date(),
        },
        select,
      });
    });

    // Notify the customer that the service was marked complete (so they can
    // leave a review).
    void this.notificationService.emit({
      userId: existing.customer.userId,
      template: 'BOOKING_COMPLETED',
      subject: 'Your booking is complete',
      body: `${existing.supplier.companyName} marked your booking complete. Leave a review?`,
      entityType: 'Booking',
      entityId: bookingId,
    });

    // Live event so both sides' /bookings lists update immediately.
    await this.publishBookingEvent(
      'COMPLETED',
      bookingId,
      existing.customerId,
      existing.supplierId,
    );

    return booking;
  }
}
