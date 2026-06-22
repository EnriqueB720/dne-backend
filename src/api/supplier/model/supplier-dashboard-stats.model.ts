import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

/**
 * Aggregated metrics for the supplier workspace dashboard. Computed on
 * demand from the supplier's quotes, bookings, and matched requests.
 *
 * All percentages are 0..100 (not 0..1). `mtdEarnings` is the sum of
 * `Booking.supplierPayout` for bookings created this calendar month.
 */
@ObjectType()
export class SupplierDashboardStats {
  /** Quotes sent ÷ matched requests in the last 30d, as a percentage. */
  @Field(() => Float)
  responseRate: number;

  /** Accepted quotes ÷ total non-pending quotes, as a percentage. */
  @Field(() => Float)
  conversionRate: number;

  /** Number of open leads (matching, not yet quoted on) for this supplier. */
  @Field(() => Int)
  activeLeadsCount: number;

  /** Sum of supplierPayout (net to supplier) for bookings created this month. */
  @Field(() => String)
  mtdEarnings: string;

  /** Sum of totalPrice (gross customer pays) for bookings created this month. */
  @Field(() => String)
  mtdGross: string;

  /** Currency for `mtdEarnings` / `mtdGross`. */
  @Field()
  currency: string;

  /** Platform fee rate as a 0..1 fraction (e.g. 0.10 = 10%). */
  @Field(() => Float)
  platformFeeRate: number;

  /** Lead counts per day for the last 7 days, oldest → newest (Mon..Sun-ish). */
  @Field(() => [Int])
  weeklyLeadCounts: number[];
}
