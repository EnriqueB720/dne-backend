import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, ConversationStatus, EventStatus, EventType, PaymentStatus, Prisma, QuoteStatus, RequestStatus } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';

import { PrismaService } from '@prisma-datasource';
import { Booking, BookingSelect } from 'src/api/booking/model';
import { BOOKING_EVENT_CHANNEL } from 'src/api/booking/booking.service';
import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import { NotificationService } from '../notification/notification.service';
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

/** PubSub channel for any change to a Quote (CREATED, ACCEPTED, …). */
export const QUOTE_EVENT_CHANNEL = 'QUOTE_EVENT';
export type QuoteEventType = 'CREATED' | 'ACCEPTED' | 'WITHDRAWN' | 'EXPIRED';

@Injectable()
export class QuoteService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  /**
   * Publish a "something on this quote changed" event so client subscriptions
   * (customer view of a request, supplier view of their quotes) refetch.
   *
   * Payload includes the actor ids so subscribers can filter for just the
   * events that concern them.
   */
  private async publishQuoteEvent(
    eventType: QuoteEventType,
    quote: { quoteId: number; requestId: number; supplierId: number; customerId: number },
  ): Promise<void> {
    void this.pubSub.publish(QUOTE_EVENT_CHANNEL, {
      quoteEvent: {
        eventType,
        quoteId: quote.quoteId,
        requestId: quote.requestId,
      },
      customerId: quote.customerId,
      supplierId: quote.supplierId,
    });
  }

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
    const { items, offeredSlots, ...quoteData } = data;
    const quote = await this.prismaService.quote.create({
      data: {
        ...quoteData,
        ...(items && items.length > 0 && {
          items: { create: items },
        }),
        // Serialize the structured slots to JSON for Prisma's Json column.
        ...(offeredSlots && offeredSlots.length > 0 && {
          offeredSlots: offeredSlots.map((s) => ({
            startsAt: s.startsAt instanceof Date ? s.startsAt.toISOString() : s.startsAt,
            endsAt: s.endsAt instanceof Date ? s.endsAt.toISOString() : s.endsAt,
          })),
        }),
      },
      select,
    });

    // Notify the customer that a new quote arrived (in-app bell).
    void this.notifyCustomerOfQuote(data.requestId, quote);

    // Live event so the customer's /requests detail panel can refetch in real
    // time instead of waiting for its poll.
    const quoteId = (quote as any).quoteId as number | undefined;
    if (quoteId) {
      const request = await this.prismaService.request.findUnique({
        where: { requestId: data.requestId },
        select: { customerId: true },
      });
      if (request) {
        await this.publishQuoteEvent('CREATED', {
          quoteId,
          requestId: data.requestId,
          supplierId: data.supplierId,
          customerId: request.customerId,
        });
      }
    }

    return quote;
  }

  private async notifyCustomerOfQuote(
    requestId: number,
    _quote: Quote,
  ): Promise<void> {
    try {
      const request = await this.prismaService.request.findUnique({
        where: { requestId },
        select: {
          customer: { select: { userId: true } },
          rawQuery: true,
        },
      });
      if (!request) return;

      // Deep-link target is the parent Request — that's where the customer
      // sees the new quote in context.
      await this.notificationService.emit({
        userId: request.customer.userId,
        template: 'NEW_QUOTE',
        subject: 'You got a new quote',
        body: `A supplier replied to your request — "${request.rawQuery.slice(0, 100)}${request.rawQuery.length > 100 ? '…' : ''}"`,
        entityType: 'Request',
        entityId: requestId,
      });
    } catch {
      // best-effort — don't fail quote creation if notification fails
    }
  }

  public async withdraw(
    { quoteId }: QuoteWithdrawInput,
    { select }: QuoteSelect,
  ): Promise<Quote> {
    const quote = await this.prismaService.quote.update({
      where: { quoteId },
      data: { status: QuoteStatus.WITHDRAWN, respondedAt: new Date() },
      select,
    });

    void this.notifyCustomerOfWithdrawal(quoteId);

    // Live event — both sides watching this request see the row update.
    const meta = await this.prismaService.quote.findUnique({
      where: { quoteId },
      select: {
        requestId: true,
        supplierId: true,
        request: { select: { customerId: true } },
      },
    });
    if (meta) {
      await this.publishQuoteEvent('WITHDRAWN', {
        quoteId,
        requestId: meta.requestId,
        supplierId: meta.supplierId,
        customerId: meta.request.customerId,
      });
    }

    return quote;
  }

  private async notifyCustomerOfWithdrawal(quoteId: number): Promise<void> {
    try {
      const quote = await this.prismaService.quote.findUnique({
        where: { quoteId },
        select: {
          requestId: true,
          request: { select: { customer: { select: { userId: true } } } },
          supplier: { select: { companyName: true } },
        },
      });
      if (!quote) return;

      // Deep-link to the parent Request — easier than opening a single Quote.
      await this.notificationService.emit({
        userId: quote.request.customer.userId,
        template: 'QUOTE_WITHDRAWN',
        subject: 'A quote was withdrawn',
        body: `${quote.supplier.companyName} withdrew their quote.`,
        entityType: 'Request',
        entityId: quote.requestId,
      });
    } catch {
      // best-effort
    }
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
    { quoteId, slotIndex }: QuoteAcceptInput,
    { select }: BookingSelect,
  ): Promise<Booking> {
    const quote = await this.prismaService.quote.findUnique({
      where: { quoteId },
      include: {
        request: {
          include: {
            customer: { select: { userId: true } },
          },
        },
        supplier: { select: { userId: true, companyName: true } },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }
    if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.VIEWED) {
      throw new BadRequestException(`Quote is ${quote.status}, cannot accept`);
    }

    // Resolve the booking window. Prefer the slot the customer picked from
    // the quote's `offeredSlots`. Fall back to the request's serviceDate for
    // backwards-compatibility with quotes that have no slots.
    const { startsAt, endsAt } = this.resolveAcceptedSlot(quote, slotIndex);

    const totalPrice = new Prisma.Decimal(quote.totalPrice.toString());
    const platformFee = totalPrice.mul(PLATFORM_FEE_RATE);
    const supplierPayout = totalPrice.minus(platformFee);

    const { booking, conversationId } = await this.prismaService.$transaction(async (tx) => {
      await tx.quote.update({
        where: { quoteId },
        data: {
          status: QuoteStatus.ACCEPTED,
          respondedAt: new Date(),
          ...(slotIndex !== undefined && slotIndex !== null && {
            selectedSlotIndex: slotIndex,
          }),
        },
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
          serviceDate: startsAt,
          serviceEndDate: endsAt,
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
      // this booking on their schedule.
      const bookingId = (booking as any).bookingId as number | undefined;
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

      // Open (or reuse) the customer↔supplier chat so both parties can
      // coordinate logistics right after booking. Idempotent — if a thread
      // already exists for this (requestId, supplierId), we keep it.
      const conversation = await tx.conversation.upsert({
        where: {
          requestId_supplierId: {
            requestId: quote.requestId,
            supplierId: quote.supplierId,
          },
        },
        create: {
          requestId: quote.requestId,
          supplierId: quote.supplierId,
          customerId: quote.request.customerId,
          status: ConversationStatus.ACTIVE,
        },
        update: {},
        select: { conversationId: true },
      });

      return { booking, conversationId: conversation.conversationId };
    });

    const bookingId = (booking as any).bookingId as number | undefined;
    const dateLabel = startsAt.toLocaleDateString();

    // Notify the supplier — clicking it lands on the booking detail panel.
    void this.notificationService.emit({
      userId: quote.supplier.userId,
      template: 'QUOTE_ACCEPTED',
      subject: 'Your quote was accepted',
      body: `The customer accepted your quote — booking confirmed for ${dateLabel}. Open the chat to coordinate.`,
      entityType: 'Booking',
      entityId: bookingId,
    });

    // Notify the customer — clicking it opens the chat thread with the
    // supplier so they can finalize logistics (address, prep, contacts, etc.).
    void this.notificationService.emit({
      userId: quote.request.customer.userId,
      template: 'BOOKING_CONFIRMED',
      subject: 'Your booking is confirmed',
      body: `${quote.supplier.companyName} is confirmed for ${dateLabel}. Message them to coordinate details.`,
      entityType: 'Conversation',
      entityId: conversationId,
    });

    // Live events so /quotes, /requests, /bookings refresh in real time on
    // both sides. We publish one ACCEPTED for the accepted quote (covers
    // customer + supplier), and a BOOKING CREATED event so /bookings lists
    // pick up the new row without waiting on their poll.
    await this.publishQuoteEvent('ACCEPTED', {
      quoteId,
      requestId: quote.requestId,
      supplierId: quote.supplierId,
      customerId: quote.request.customerId,
    });
    if (bookingId) {
      void this.pubSub.publish(BOOKING_EVENT_CHANNEL, {
        bookingEvent: { eventType: 'CREATED', bookingId },
        customerId: quote.request.customerId,
        supplierId: quote.supplierId,
      });
    }

    return booking;
  }

  /**
   * Pick the time window for the new booking. Slots are stored on the quote
   * as JSON `[{ startsAt, endsAt }, …]`. If the customer didn't pick a slot
   * (or the quote has none), fall back to the request's `serviceDate` and
   * default to a 4-hour window.
   */
  private resolveAcceptedSlot(
    quote: { offeredSlots: unknown; request: { serviceDate: Date | null } },
    slotIndex: number | undefined | null,
  ): { startsAt: Date; endsAt: Date } {
    const slots = Array.isArray(quote.offeredSlots)
      ? (quote.offeredSlots as Array<{ startsAt?: string | Date; endsAt?: string | Date }>)
      : [];

    if (slotIndex !== undefined && slotIndex !== null && slots[slotIndex]) {
      const s = slots[slotIndex];
      if (!s.startsAt || !s.endsAt) {
        throw new BadRequestException('Selected slot is missing startsAt/endsAt');
      }
      return {
        startsAt: new Date(s.startsAt),
        endsAt: new Date(s.endsAt),
      };
    }

    if (!quote.request.serviceDate) {
      throw new BadRequestException(
        'No slot picked and the request has no service date — cannot accept',
      );
    }
    const startsAt = new Date(quote.request.serviceDate);
    const endsAt = new Date(startsAt);
    endsAt.setHours(endsAt.getHours() + 4);
    return { startsAt, endsAt };
  }
}
