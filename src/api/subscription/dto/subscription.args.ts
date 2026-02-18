import { ArgsType, Field } from '@nestjs/graphql';
import { SubscriptionWhereInput } from './subscription-where.input';

@ArgsType()
export class SubscriptionArgs {
  @Field(() => SubscriptionWhereInput)
  where: SubscriptionWhereInput;
}
