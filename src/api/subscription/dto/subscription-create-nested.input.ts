import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SubscriptionCreateNestedInput {
  @Field(() => Int)
  planId: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field()
  status: string;
}
