import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, EventStatus, EventType, PaymentStatus, Prisma, QuoteStatus, RequestStatus } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import { Booking, BookingSelect } from 'src/api/booking/model';
import {
  QuoteAcceptInput,
  QuoteArgs,
  QuoteCreateInput,
  QuoteWithdrawInput,
  QuotesByRequestArgs,
  QuotesBySupplierArgs,
} from './dto';
import { Quote, QuoteSelect } from './model';

const PLATFORM_FEE_RATE = '0.10';

@Injectable()
export class QuoteService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: QuoteArgs,
    { select }: QuoteSelect,
  ): Promise<Quote> {
    return await this.prismaService.quote.findFirst({
      where,
      select,
    });
  }

  public async findManyByRequest(
    { requestId, status }: QuotesByRequestArgs,
    { select }: QuoteSelect,
  ): Promise<Quote[]> {
    return await this.prismaService.quote.findMany({
      where: { requestId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  public async findManyBySupplier(
    { supplierId, status }: QuotesBySupplierArgs,
    { select }: QuoteSelect,
  ): Promise<Quote[]> {
    return await this.prismaService.quote.findMany({
      where: { supplierId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  public async create(
    data: QuoteCreateInput,
    { select }: QuoteSelect,
  ): Promise<Quote> {
    const { items, ...quoteData } = data;
    return await this.prismaService.quote.create({
      data: {
        ...quoteData,
        ...(items && items.length > 0 && {
          items: { create: items },
        }),
      },
      select,
    });
  }

  public async withdraw(
    { quoteId }: QuoteWithdrawInput,
    { select }: QuoteSelect,
  ): Promise<Quote> {
    return await this.prismaService.quote.update({
      where: { quoteId },
      data: { status: QuoteStatus.WITHDRAWN, respondedAt: new Date() },
      select,
    });
  }

  /**
   * Flip all SENT quotes on a request to VIEWED. Called by the customer's UI
   * when they open the request detail panel so the "new" badge clears.
   */
  public async markRequestQuotesViewed(requestId: number): Promise<number> {
    const result = await this.prismaService.quote.updateMany({
      where: { requestId, status: QuoteStatus.SENT },
      data: { status: QuoteStatus.VIEWED, viewedAt: new Date() },
    });
    return result.count;
  }

  public async accept(
    { quoteId }: QuoteAcceptInput,
    { select }: BookingSelect,
  ): Promise<Booking> {
    const quote = await this.prismaService.quote.findUnique({
      where: { quoteId },
      include: { request: true },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }
    if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.VIEWED) {
      throw new BadRequestException(`Quote is ${quote.status}, cannot accept`);
    }
    if (!quote.request.serviceDate) {
      throw new BadRequestException('Request has no service date; set one before accepting a quote');
    }

    const totalPrice = new Prisma.Decimal(quote.totalPrice.toString());
    const platformFee = totalPrice.mul(PLATFORM_FEE_RATE);
    const supplierPayout = totalPrice.minus(platformFee);

    return await this.prismaService.$transaction(async (tx) => {
      await tx.quote.update({
        where: { quoteId },
        data: { status: QuoteStatus.ACCEPTED, respondedAt: new Date() },
      });

      await tx.quote.updateMany({
        where: {
          requestId: quote.requestId,
          quoteId: { not: quoteId },
          status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED] },
        },
        data: { status: QuoteStatus.EXPIRED },
      });

      await tx.request.update({
        where: { requestId: quote.requestId },
        data: { status: RequestStatus.BOOKED },
      });

      const booking = await tx.booking.create({
        data: {
          requestId: quote.requestId,
          quoteId: quote.quoteId,
          customerId: quote.request.customerId,
          supplierId: quote.supplierId,
          serviceDate: quote.request.serviceDate,
          location: quote.request.city ?? 'TBD',
          guestCount: quote.request.guestCount,
          totalPrice,
          platformFee,
          supplierPayout,
          currency: quote.currency,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
        },
        select,
      });

      // Auto-create a calendar event on the supplier's calendar so they see
      // this booking on their schedule. Default to a 4-hour slot starting at
      // serviceDate — supplier can edit if they want a different window.
      const bookingId = (booking as any).bookingId as number | undefined;
      const startsAt = quote.request.serviceDate;
      const endsAt = new Date(startsAt);
      endsAt.setHours(endsAt.getHours() + 4);

      await tx.calendarEvent.create({
        data: {
          supplierId: quote.supplierId,
          eventType: EventType.BOOKING,
          title: `Booking — ${quote.request.rawQuery.slice(0, 60)}`,
          startsAt,
          endsAt,
          allDay: false,
          location: quote.request.city ?? null,
          bookingId: bookingId ?? undefined,
          quoteId: quote.quoteId,
          status: EventStatus.ACTIVE,
        },
      });

      return booking;
    });
  }
}
