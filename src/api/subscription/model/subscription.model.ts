import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Pricing } from 'src/api/pricing/model';
import { User } from 'src/api/user/model';

// GraphQL name is overridden to `PlanSubscription` so it doesn't collide
// with GraphQL's root `Subscription` type (used by graphql-ws live updates).
// The TypeScript class is kept as `Subscription` for backwards compatibility
// with existing imports across the codebase.
@ObjectType('PlanSubscription')
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
