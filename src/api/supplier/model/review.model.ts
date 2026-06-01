import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * A review left by a customer on a completed booking. Lives under the
 * Supplier module because the canonical fetch is "this supplier's reviews"
 * (rendered on the public storefront).
 */
@ObjectType()
export class Review {
  @Field(() => Int)
  reviewId: number;

  @Field(() => Int)
  bookingId: number;

  @Field(() => Int)
  customerId: number;

  @Field(() => Int)
  supplierId: number;

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

  @Field({ nullable: true })
  supplierResponse?: string;

  @Field()
  createdAt: Date;
}
