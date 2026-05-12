import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, EventType } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import {
  CalendarEventArgs,
  CalendarEventCancelInput,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
  CalendarEventsBySupplierArgs,
} from './dto';
import { CalendarEvent, CalendarEventSelect } from './model';

@Injectable()
export class CalendarEventService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: CalendarEventArgs,
    { select }: CalendarEventSelect,
  ): Promise<CalendarEvent> {
    return await this.prismaService.calendarEvent.findFirst({
      where,
      select,
    });
  }

  /**
   * Returns events for a supplier that overlap the [from, to) window.
   * If from/to are omitted, returns everything.
   * Excludes CANCELLED events.
   */
  public async findManyBySupplier(
    { supplierId, from, to }: CalendarEventsBySupplierArgs,
    { select }: CalendarEventSelect,
  ): Promise<CalendarEvent[]> {
    return await this.prismaService.calendarEvent.findMany({
      where: {
        supplierId,
        status: { not: EventStatus.CANCELLED },
        ...(from && { endsAt: { gte: from } }),
        ...(to && { startsAt: { lt: to } }),
      },
      orderBy: { startsAt: 'asc' },
      select,
    });
  }

  public async create(
    data: CalendarEventCreateInput,
    { select }: CalendarEventSelect,
  ): Promise<CalendarEvent> {
    if (new Date(data.endsAt) <= new Date(data.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    // BOOKING events are only minted by acceptQuote — block manual creation
    const eventType = data.eventType ?? EventType.BLOCKED;
    if (eventType === EventType.BOOKING) {
      throw new BadRequestException(
        'BOOKING events are created automatically when a quote is accepted',
      );
    }

    return await this.prismaService.calendarEvent.create({
      data: {
        supplierId: data.supplierId,
        eventType,
        title: data.title,
        notes: data.notes,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        allDay: data.allDay ?? false,
        timezone: data.timezone ?? 'America/Costa_Rica',
        location: data.location,
        recurrenceRule: data.recurrenceRule,
      },
      select,
    });
  }

  public async update(
    { calendarEventId, ...patch }: CalendarEventUpdateInput,
    { select }: CalendarEventSelect,
  ): Promise<CalendarEvent> {
    const existing = await this.prismaService.calendarEvent.findUnique({
      where: { calendarEventId },
    });
    if (!existing) {
      throw new NotFoundException(`Calendar event ${calendarEventId} not found`);
    }
    if (existing.eventType === EventType.BOOKING) {
      throw new BadRequestException('BOOKING events are managed by the booking lifecycle');
    }

    if (patch.startsAt && patch.endsAt && new Date(patch.endsAt) <= new Date(patch.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return await this.prismaService.calendarEvent.update({
      where: { calendarEventId },
      data: patch,
      select,
    });
  }

  public async cancel(
    { calendarEventId }: CalendarEventCancelInput,
    { select }: CalendarEventSelect,
  ): Promise<CalendarEvent> {
    const existing = await this.prismaService.calendarEvent.findUnique({
      where: { calendarEventId },
    });
    if (!existing) {
      throw new NotFoundException(`Calendar event ${calendarEventId} not found`);
    }
    if (existing.eventType === EventType.BOOKING) {
      throw new BadRequestException(
        'BOOKING events are cancelled through the booking, not directly',
      );
    }

    return await this.prismaService.calendarEvent.update({
      where: { calendarEventId },
      data: { status: EventStatus.CANCELLED },
      select,
    });
  }
}
