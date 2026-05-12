import { ArgsType, Field } from '@nestjs/graphql';
import { BookingWhereInput } from './booking-where.input';

@ArgsType()
export class BookingArgs {
  @Field(() => BookingWhereInput)
  where: BookingWhereInput;
}
