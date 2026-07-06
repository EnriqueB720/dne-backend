import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Top-of-page stats for the admin dashboard. All counts are at-call-time,
 * not snapshots — refresh by re-running the query.
 */
@ObjectType()
export class AdminStats {
  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  totalCustomers: number;

  @Field(() => Int)
  totalSuppliers: number;

  @Field(() => Int)
  totalBookings: number;

  /** Sum of `Booking.platformFee` for bookings created this calendar month. */
  @Field(() => String)
  mtdRevenue: string;

  /** Sum of `Booking.platformFee` across all confirmed/completed bookings. */
  @Field(() => String)
  allTimeRevenue: string;

  @Field()
  currency: string;
}
