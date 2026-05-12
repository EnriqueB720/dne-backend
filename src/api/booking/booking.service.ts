import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, EventStatus, RequestStatus } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import {
  BookingArgs,
  BookingCancelInput,
  BookingCompleteInput,
  BookingsByCustomerArgs,
  BookingsBySupplierArgs,
} from './dto';
import { Booking, BookingSelect } from './model';

@Injectable()
export class BookingService {
  constructor(private readonly prismaService: PrismaService) {}

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
      select: { requestId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    return await this.prismaService.$transaction(async (tx) => {
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
  }

  public async complete(
    { bookingId }: BookingCompleteInput,
    { select }: BookingSelect,
  ): Promise<Booking> {
    const existing = await this.prismaService.booking.findUnique({
      where: { bookingId },
      select: { requestId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    return await this.prismaService.$transaction(async (tx) => {
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
  }
}
