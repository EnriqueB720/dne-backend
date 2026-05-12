import { ArgsType, Field, Int } from '@nestjs/graphql';
import { BookingStatus } from '@prisma/client';

@ArgsType()
export class BookingsByCustomerArgs {
  @Field(() => Int)
  customerId: number;

  @Field(() => BookingStatus, { nullable: true })
  status?: BookingStatus;
}
