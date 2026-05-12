import { InputType, Field, Int } from '@nestjs/graphql';
import { EventType } from '@prisma/client';

@InputType()
export class CalendarEventCreateInput {
  @Field(() => Int)
  supplierId: number;

  @Field(() => EventType, { nullable: true })
  eventType?: EventType;

  @Field()
  title: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  startsAt: Date;

  @Field()
  endsAt: Date;

  @Field({ nullable: true })
  allDay?: boolean;

  @Field({ nullable: true })
  timezone?: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  recurrenceRule?: string;
}
