import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class QuoteMarkViewedInput {
  @Field(() => Int)
  requestId: number;
}
