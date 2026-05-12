import { ArgsType, Field, Int } from '@nestjs/graphql';
import { BookingStatus } from '@prisma/client';

@ArgsType()
export class BookingsBySupplierArgs {
  @Field(() => Int)
  supplierId: number;

  @Field(() => BookingStatus, { nullable: true })
  status?: BookingStatus;
}
