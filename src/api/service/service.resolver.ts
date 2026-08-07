import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { ServiceService } from './service.service';
import { Service, ServiceSelect } from './model';
import {
  ServiceCreateInput,
  ServiceDeleteInput,
  ServiceUpdateInput,
  ServicesBySupplierArgs,
} from './dto';

@Resolver(() => Service)
export class ServiceResolver {
  constructor(private readonly serviceService: ServiceService) {}

  @Query(() => [Service])
  public async servicesBySupplier(
    @Args() args: ServicesBySupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<ServiceSelect>,
  ): Promise<Service[]> {
    return await this.serviceService.findManyBySupplier(args, fields);
  }

  @Mutation(() => Service)
  public async createService(
    @Args('data') data: ServiceCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<ServiceSelect>,
  ): Promise<Service> {
    return await this.serviceService.create(data, fields);
  }

  @Mutation(() => Service)
  public async updateService(
    @Args('data') data: ServiceUpdateInput,
    @GraphQLFields() { fields }: IGraphQLFields<ServiceSelect>,
  ): Promise<Service> {
    return await this.serviceService.update(data, fields);
  }

  @Mutation(() => Boolean)
  public async deleteService(
    @Args('data') data: ServiceDeleteInput,
  ): Promise<boolean> {
    return await this.serviceService.delete(data);
  }
}
