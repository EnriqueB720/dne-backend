import { ArgsType, Field, Int } from '@nestjs/graphql';
import { QuoteStatus } from '@prisma/client';

@ArgsType()
export class QuotesBySupplierArgs {
  @Field(() => Int)
  supplierId: number;

  @Field(() => QuoteStatus, { nullable: true })
  status?: QuoteStatus;
}
