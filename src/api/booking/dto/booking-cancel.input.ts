import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class BookingCancelInput {
  @Field(() => Int)
  bookingId: number;

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  cancelledBy?: string;
}
