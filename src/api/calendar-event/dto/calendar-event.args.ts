import { ArgsType, Field } from '@nestjs/graphql';
import { CalendarEventWhereInput } from './calendar-event-where.input';

@ArgsType()
export class CalendarEventArgs {
  @Field(() => CalendarEventWhereInput)
  where: CalendarEventWhereInput;
}
