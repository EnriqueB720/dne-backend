import { Inject } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import { BOOKING_EVENT_CHANNEL, BookingService } from './booking.service';
import { Booking, BookingEvent, BookingSelect } from './model';
import {
  BookingArgs,
  BookingCancelInput,
  BookingCompleteInput,
  BookingsByCustomerArgs,
  BookingsBySupplierArgs,
} from './dto';

@Resolver(() => Booking)
export class BookingResolver {
  constructor(
    private readonly bookingService: BookingService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => Booking)
  public async booking(
    @Args() args: BookingArgs,
    @GraphQLFields() { fields }: IGraphQLFields<BookingSelect>,
  ): Promise<Booking> {
    return await this.bookingService.findOne(args, fields);
  }

  @Query(() => [Booking])
  public async bookingsByCustomer(
    @Args() args: BookingsByCustomerArgs,
    @GraphQLFields() { fields }: IGraphQLFields<BookingSelect>,
  ): Promise<Booking[]> {
    return await this.bookingService.findManyByCustomer(args, fields);
  }

  @Query(() => [Booking])
  public async bookingsBySupplier(
    @Args() args: BookingsBySupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<BookingSelect>,
  ): Promise<Booking[]> {
    return await this.bookingService.findManyBySupplier(args, fields);
  }

  @Mutation(() => Booking)
  public async cancelBooking(
    @Args('data') data: BookingCancelInput,
    @GraphQLFields() { fields }: IGraphQLFields<BookingSelect>,
  ): Promise<Booking> {
    return await this.bookingService.cancel(data, fields);
  }

  @Mutation(() => Booking)
  public async completeBooking(
    @Args('data') data: BookingCompleteInput,
    @GraphQLFields() { fields }: IGraphQLFields<BookingSelect>,
  ): Promise<Booking> {
    return await this.bookingService.complete(data, fields);
  }

  // ── Subscriptions ───────────────────────────────────────────────────

  @Subscription(() => BookingEvent, {
    name: 'bookingEventForCustomer',
    filter: (payload, variables) => payload.customerId === variables.customerId,
    resolve: (payload) => payload.bookingEvent,
  })
  public bookingEventForCustomer(@Args('customerId', { type: () => Int }) _customerId: number) {
    return this.pubSub.asyncIterableIterator(BOOKING_EVENT_CHANNEL);
  }

  @Subscription(() => BookingEvent, {
    name: 'bookingEventForSupplier',
    filter: (payload, variables) => payload.supplierId === variables.supplierId,
    resolve: (payload) => payload.bookingEvent,
  })
  public bookingEventForSupplier(@Args('supplierId', { type: () => Int }) _supplierId: number) {
    return this.pubSub.asyncIterableIterator(BOOKING_EVENT_CHANNEL);
  }
}
