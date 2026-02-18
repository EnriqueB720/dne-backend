import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class PricingWhereInput {
  @Field(() => Int, { nullable: true })
  planId?: number;
}
