import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Pricing } from 'src/api/pricing/model';
import { User } from 'src/api/user/model';

@ObjectType()
export class Subscription {
  @Field()
  subscriptionId: number;

  @Field()
  userId: number;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field()
  planId: number;

  @Field(() => Pricing, { nullable: true })
  plan?: Pricing;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field()
  status: string;
}
