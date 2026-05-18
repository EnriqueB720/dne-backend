import { Inject } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { Booking, BookingSelect } from 'src/api/booking/model';
import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import { QUOTE_EVENT_CHANNEL, QuoteService } from './quote.service';
import { Quote, QuoteEvent, QuoteSelect } from './model';
import {
  QuoteAcceptInput,
  QuoteArgs,
  QuoteCreateInput,
  QuoteMarkViewedInput,
  QuoteWithdrawInput,
  QuotesByRequestArgs,
  QuotesBySupplierArgs,
} from './dto';

@Resolver(() => Quote)
export class QuoteResolver {
  constructor(
    private readonly quoteService: QuoteService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => Quote)
  public async quote(
    @Args() args: QuoteArgs,
    @GraphQLFields() { fields }: IGraphQLFields<QuoteSelect>,
  ): Promise<Quote> {
    return await this.quoteService.findOne(args, fields);
  }

  @Query(() => [Quote])
  public async quotesByRequest(
    @Args() args: QuotesByRequestArgs,
    @GraphQLFields() { fields }: IGraphQLFields<QuoteSelect>,
  ): Promise<Quote[]> {
    return await this.quoteService.findManyByRequest(args, fields);
  }

  @Query(() => [Quote])
  public async quotesBySupplier(
    @Args() args: QuotesBySupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<QuoteSelect>,
  ): Promise<Quote[]> {
    return await this.quoteService.findManyBySupplier(args, fields);
  }

  @Mutation(() => Quote)
  public async createQuote(
    @Args('data') data: QuoteCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<QuoteSelect>,
  ): Promise<Quote> {
    return await this.quoteService.create(data, fields);
  }

  @Mutation(() => Quote)
  public async withdrawQuote(
    @Args('data') data: QuoteWithdrawInput,
    @GraphQLFields() { fields }: IGraphQLFields<QuoteSelect>,
  ): Promise<Quote> {
    return await this.quoteService.withdraw(data, fields);
  }

  @Mutation(() => Booking)
  public async acceptQuote(
    @Args('data') data: QuoteAcceptInput,
    @GraphQLFields() { fields }: IGraphQLFields<BookingSelect>,
  ): Promise<Booking> {
    return await this.quoteService.accept(data, fields);
  }

  /** Returns the number of quotes flipped from SENT → VIEWED. */
  @Mutation(() => Number)
  public async markQuotesViewed(
    @Args('data') data: QuoteMarkViewedInput,
  ): Promise<number> {
    return await this.quoteService.markRequestQuotesViewed(data.requestId);
  }

  // ── Subscriptions ───────────────────────────────────────────────────

  /**
   * Live quote-changed events for the given customer. Subscribers should
   * call refetch on their list/detail queries when an event arrives.
   */
  @Subscription(() => QuoteEvent, {
    name: 'quoteEventForCustomer',
    filter: (payload, variables) => payload.customerId === variables.customerId,
    resolve: (payload) => payload.quoteEvent,
  })
  public quoteEventForCustomer(@Args('customerId', { type: () => Int }) _customerId: number) {
    return this.pubSub.asyncIterableIterator(QUOTE_EVENT_CHANNEL);
  }

  /** Same, for a supplier. */
  @Subscription(() => QuoteEvent, {
    name: 'quoteEventForSupplier',
    filter: (payload, variables) => payload.supplierId === variables.supplierId,
    resolve: (payload) => payload.quoteEvent,
  })
  public quoteEventForSupplier(@Args('supplierId', { type: () => Int }) _supplierId: number) {
    return this.pubSub.asyncIterableIterator(QUOTE_EVENT_CHANNEL);
  }
}
