import { InputType, Field, Int } from '@nestjs/graphql';
import { EventStatus } from '@prisma/client';

@InputType()
export class CalendarEventUpdateInput {
  @Field(() => Int)
  calendarEventId: number;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field({ nullable: true })
  startsAt?: Date;

  @Field({ nullable: true })
  endsAt?: Date;

  @Field({ nullable: true })
  allDay?: boolean;

  @Field({ nullable: true })
  location?: string;

  @Field(() => EventStatus, { nullable: true })
  status?: EventStatus;
}
