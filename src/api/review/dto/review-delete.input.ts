import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ReviewDeleteInput {
  @Field(() => Int)
  reviewId: number;

  /** Must match the review's author — enforced by the service. */
  @Field(() => Int)
  customerId: number;
}
