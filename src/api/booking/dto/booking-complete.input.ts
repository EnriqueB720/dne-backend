import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class BookingCompleteInput {
  @Field(() => Int)
  bookingId: number;
}
