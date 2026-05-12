import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class BookingWhereInput {
  @Field(() => Int, { nullable: true })
  bookingId?: number;
}
