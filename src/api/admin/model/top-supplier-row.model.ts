import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * One row of the "top suppliers" leaderboard on the admin dashboard.
 * Ordered by booking count (most-active first).
 */
@ObjectType()
export class TopSupplierRow {
  @Field(() => Int)
  supplierId: number;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  city?: string;

  @Field(() => Int)
  bookingCount: number;

  @Field(() => Int)
  quoteCount: number;

  /** Sum of `Booking.totalPrice` across that supplier's bookings. */
  @Field(() => String)
  grossRevenue: string;

  @Field(() => String, { nullable: true })
  rating?: string;
}
