import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';

import { CurrentUser, GraphQLFields, IGraphQLFields } from '@decorators';
import { JwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';
import { ServiceInput } from './dto';
import { Service, ServiceSelect } from './model';
import { ServiceService } from './service.service';

/** The signed-in supplier's services. Read them through `supplier { services }`. */
@Resolver(() => Service)
@UseGuards(JwtAuthGuard)
export class ServiceResolver {
  constructor(private readonly serviceService: ServiceService) {}

  @Mutation(() => Service)
  public async saveMyService(
    @Args('data') data: ServiceInput,
    @CurrentUser() user: IAuthUser,
    @GraphQLFields() { fields }: IGraphQLFields<ServiceSelect>,
  ): Promise<Service> {
    return this.serviceService.save(Number(user.sub), data, fields);
  }

  @Mutation(() => Boolean)
  public async deleteMyService(
    @Args('serviceId', { type: () => Int }) serviceId: number,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.serviceService.remove(Number(user.sub), serviceId);
  }
}
