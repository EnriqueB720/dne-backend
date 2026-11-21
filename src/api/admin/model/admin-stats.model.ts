import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

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

  /** Total contact-reveal leads (LeadEvent) generated, all time. */
  @Field(() => Int)
  totalLeads: number;

  /** Contact-reveal leads (LeadEvent) generated this calendar month. */
  @Field(() => Int)
  leadsThisMonth: number;

  /**
   * Current Monthly Recurring Revenue: sum of each active (ACTIVE/TRIALING)
   * paid-plan subscription's monthly price, one per supplier it covers.
   */
  @Field(() => String)
  mrr: string;

  /** Suppliers currently on an active, non-free subscription plan. */
  @Field(() => Int)
  paidSupplierCount: number;

  /**
   * Of suppliers who ever subscribed to a plan (free or paid), the % now
   * on a paid plan. 0 when no supplier has subscribed to anything yet.
   */
  @Field(() => Float)
  freeToPaidConversionRate: number;
}
