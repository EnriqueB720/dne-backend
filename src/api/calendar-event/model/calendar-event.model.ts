import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EventStatus, EventType } from '@prisma/client';

@ObjectType()
export class CalendarEvent {
  @Field()
  calendarEventId: number;

  @Field()
  supplierId: number;

  @Field(() => EventType)
  eventType: EventType;

  @Field()
  title: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  startsAt: Date;

  @Field()
  endsAt: Date;

  @Field()
  allDay: boolean;

  @Field()
  timezone: string;

  @Field({ nullable: true })
  bookingId?: number;

  @Field({ nullable: true })
  quoteId?: number;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  recurrenceRule?: string;

  @Field(() => EventStatus)
  status: EventStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

registerEnumType(EventType, {
  name: 'EventType',
  description: 'Type of supplier calendar event',
});

registerEnumType(EventStatus, {
  name: 'EventStatus',
  description: 'Lifecycle status of a calendar event',
});
