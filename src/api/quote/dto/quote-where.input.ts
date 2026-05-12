import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class QuoteWhereInput {
  @Field(() => Int, { nullable: true })
  quoteId?: number;
}
