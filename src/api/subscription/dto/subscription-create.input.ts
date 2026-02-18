import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SubscriptionCreateInput {
  @Field()
  userId: number;

  @Field()
  planId: number;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field()
  status: string;
}
