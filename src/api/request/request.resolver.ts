import { Inject } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import {
  OPEN_REQUEST_EVENT_CHANNEL,
  REQUEST_EVENT_CHANNEL,
  RequestService,
} from './request.service';
import { Request, RequestEvent, RequestSelect } from './model';
import {
  OpenRequestsForSupplierArgs,
  RequestArgs,
  RequestCloseInput,
  RequestCreateInput,
  RequestListArgs,
  RequestsBySupplierArgs,
  RequestUpdateStatusInput,
} from './dto';

@Resolver(() => Request)
export class RequestResolver {
  constructor(
    private readonly requestService: RequestService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

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

  @Query(() => [Request])
  public async requestsBySupplier(
    @Args() args: RequestsBySupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<RequestSelect>,
  ): Promise<Request[]> {
    return await this.requestService.findManyBySupplier(args, fields);
  }

  /** "Open leads" — requests matching the supplier that they haven't quoted on yet. */
  @Query(() => [Request])
  public async openRequestsForSupplier(
    @Args() args: OpenRequestsForSupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<RequestSelect>,
  ): Promise<Request[]> {
    return await this.requestService.findOpenForSupplier(args, fields);
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

  // ── Subscriptions ───────────────────────────────────────────────────

  /**
   * Live request-lifecycle events for the given customer (their own list
   * refetches on each event).
   */
  @Subscription(() => RequestEvent, {
    name: 'requestEventForCustomer',
    filter: (payload, variables) => payload.customerId === variables.customerId,
    resolve: (payload) => payload.requestEvent,
  })
  public requestEventForCustomer(@Args('customerId', { type: () => Int }) _customerId: number) {
    return this.pubSub.asyncIterableIterator(REQUEST_EVENT_CHANNEL);
  }

  /**
   * Live "new open lead" events for the given supplier — their Open leads
   * inbox refetches when a new matching request comes in.
   */
  @Subscription(() => RequestEvent, {
    name: 'openRequestEventForSupplier',
    filter: (payload, variables) => payload.supplierId === variables.supplierId,
    resolve: (payload) => payload.requestEvent,
  })
  public openRequestEventForSupplier(@Args('supplierId', { type: () => Int }) _supplierId: number) {
    return this.pubSub.asyncIterableIterator(OPEN_REQUEST_EVENT_CHANNEL);
  }
}
