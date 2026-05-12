import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { RequestService } from './request.service';
import { Request, RequestSelect } from './model';
import {
  RequestArgs,
  RequestCloseInput,
  RequestCreateInput,
  RequestListArgs,
  RequestUpdateStatusInput,
} from './dto';

@Resolver(() => Request)
export class RequestResolver {
  constructor(private readonly requestService: RequestService) {}

  @Query(() => Request)
  public async request(
    @Args() args: RequestArgs,
    @GraphQLFields() { fields }: IGraphQLFields<RequestSelect>,
  ): Promise<Request> {
    return await this.requestService.findOne(args, fields);
  }

  @Query(() => [Request])
  public async requestsByCustomer(
    @Args() args: RequestListArgs,
    @GraphQLFields() { fields }: IGraphQLFields<RequestSelect>,
  ): Promise<Request[]> {
    return await this.requestService.findManyByCustomer(args, fields);
  }

  @Mutation(() => Request)
  public async createRequest(
    @Args('data') data: RequestCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<RequestSelect>,
  ): Promise<Request> {
    return await this.requestService.create(data, fields);
  }

  @Mutation(() => Request)
  public async updateRequestStatus(
    @Args('data') data: RequestUpdateStatusInput,
    @GraphQLFields() { fields }: IGraphQLFields<RequestSelect>,
  ): Promise<Request> {
    return await this.requestService.updateStatus(data, fields);
  }

  @Mutation(() => Request)
  public async closeRequest(
    @Args('data') data: RequestCloseInput,
    @GraphQLFields() { fields }: IGraphQLFields<RequestSelect>,
  ): Promise<Request> {
    return await this.requestService.close(data, fields);
  }
}
