import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class QuoteAcceptInput {
  @Field(() => Int)
  quoteId: number;
}
