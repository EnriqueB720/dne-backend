import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CalendarEventCancelInput {
  @Field(() => Int)
  calendarEventId: number;
}
