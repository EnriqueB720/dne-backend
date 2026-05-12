import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CalendarEventWhereInput {
  @Field(() => Int, { nullable: true })
  calendarEventId?: number;
}
