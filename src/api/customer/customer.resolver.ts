import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { CustomerService } from './customer.service';
import { Customer, CustomerSelect } from './model';
import { CustomerArgs, CustomerUpdateInput } from './dto';

@Resolver(() => Customer)
export class CustomerResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Query(() => Customer)
  public async customer(
    @Args() args: CustomerArgs,
    @GraphQLFields() { fields }: IGraphQLFields<CustomerSelect>,
  ): Promise<Customer> {
    return await this.customerService.findOne(args, fields);
  }

  @Mutation(() => Customer)
  public async updateCustomer(
    @Args('data') data: CustomerUpdateInput,
    @GraphQLFields() { fields }: IGraphQLFields<CustomerSelect>,
  ): Promise<Customer> {
    return await this.customerService.update(data, fields);
  }
}
