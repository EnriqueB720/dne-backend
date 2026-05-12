import { ArgsType, Field, Int } from '@nestjs/graphql';
import { QuoteStatus } from '@prisma/client';

@ArgsType()
export class QuotesByRequestArgs {
  @Field(() => Int)
  requestId: number;

  @Field(() => QuoteStatus, { nullable: true })
  status?: QuoteStatus;
}
