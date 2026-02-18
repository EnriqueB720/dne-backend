import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Subscription, SubscriptionSelect } from './model';
import { SubscriptionService } from './subscription.service';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { SubscriptionArgs, SubscriptionCreateInput } from './dto';

@Resolver(() => Subscription)
export class SubscriptionResolver {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Query(() => Subscription)
  public async subscription(
    @Args() args: SubscriptionArgs,
    @GraphQLFields() { fields }: IGraphQLFields<SubscriptionSelect>,
  ): Promise<Subscription> {
    return await this.subscriptionService.findOne(args, fields);
  }

  @Mutation(() => Subscription)
  public async createSubscription(
    @Args('data') data: SubscriptionCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<SubscriptionSelect>,
  ): Promise<Subscription> {
    return await this.subscriptionService.create(data, fields);
  }
}
