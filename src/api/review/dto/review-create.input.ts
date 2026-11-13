import { InputType, Field, Int } from '@nestjs/graphql';

/**
 * Two ways to leave a review:
 *  - Storefront (Phase 5 default): pass `supplierId`. Any signed-in customer
 *    can review a supplier once; a second review is rejected in favour of
 *    editing the first.
 *  - Legacy booking flow: pass `bookingId`. The booking must belong to the
 *    reviewer, be COMPLETED and not reviewed yet.
 * The reviewer is always the signed-in user, never the input.
 */
@InputType()
export class ReviewCreateInput {
  @Field(() => Int, { nullable: true })
  supplierId?: number;

  @Field(() => Int, { nullable: true })
  bookingId?: number;

  /**
   * Optional cross-check only. When sent it must match the signed-in
   * user's customer profile, so a stale client can't post as someone else.
   */
  @Field(() => Int, { nullable: true })
  customerId?: number;

  /** Overall rating, 1–5. */
  @Field(() => Int)
  rating: number;

  @Field({ nullable: true })
  text?: string;

  @Field(() => Int, { nullable: true })
  ratingQuality?: number;

  @Field(() => Int, { nullable: true })
  ratingCommunication?: number;

  @Field(() => Int, { nullable: true })
  ratingValue?: number;

  @Field(() => Int, { nullable: true })
  ratingPunctuality?: number;
}
