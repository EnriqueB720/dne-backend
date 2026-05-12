import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class QuoteWithdrawInput {
  @Field(() => Int)
  quoteId: number;
}
