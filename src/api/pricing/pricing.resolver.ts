import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Pricing, PricingSelect } from './model';
import { PricingService } from './pricing.service';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { PricingArgs, PricingCreateInput } from './dto';

@Resolver(() => Pricing)
export class PricingResolver {
  constructor(private readonly pricingService: PricingService) {}

  @Query(() => Pricing)
  public async pricing(
    @Args() args: PricingArgs,
    @GraphQLFields() { fields }: IGraphQLFields<PricingSelect>,
  ): Promise<Pricing> {
    return await this.pricingService.findOne(args, fields);
  }

  @Mutation(() => Pricing)
  public async createPricing(
    @Args('data') data: PricingCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<PricingSelect>,
  ): Promise<Pricing> {
    return await this.pricingService.create(data, fields);
  }
}
