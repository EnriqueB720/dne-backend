import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SubscriptionWhereInput {
  @Field(() => Int, { nullable: true })
  subscriptionId?: number;
}
