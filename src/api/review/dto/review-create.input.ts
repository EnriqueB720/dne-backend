import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ReviewCreateInput {
  @Field(() => Int)
  bookingId: number;

  /**
   * Customer submitting the review. Must match the booking's customer —
   * the service rejects mismatches so one customer can't review another
   * customer's booking.
   */
  @Field(() => Int)
  customerId: number;

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
