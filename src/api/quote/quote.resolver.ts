import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { Booking, BookingSelect } from 'src/api/booking/model';
import { QuoteService } from './quote.service';
import { Quote, QuoteSelect } from './model';
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
  constructor(private readonly quoteService: QuoteService) {}

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
}
