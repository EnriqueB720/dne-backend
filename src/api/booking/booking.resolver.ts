import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { BookingService } from './booking.service';
import { Booking, BookingSelect } from './model';
import {
  BookingArgs,
  BookingCancelInput,
  BookingCompleteInput,
  BookingsByCustomerArgs,
  BookingsBySupplierArgs,
} from './dto';

@Resolver(() => Booking)
export class BookingResolver {
  constructor(private readonly bookingService: BookingService) {}

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
}
