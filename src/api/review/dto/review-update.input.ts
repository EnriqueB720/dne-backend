import { InputType, Field, Int } from '@nestjs/graphql';

/**
 * Full-replace update: the edit form always sends the complete set of
 * fields, so omitted optional ratings/text are cleared rather than kept.
 */
@InputType()
export class ReviewUpdateInput {
  @Field(() => Int)
  reviewId: number;

  /** Must match the review's author — enforced by the service. */
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
