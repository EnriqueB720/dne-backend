import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * A review as shown on a public profile. Built by hand (not a Prisma
 * select) so nothing about the reviewer beyond a short display name can
 * ever leak through the API.
 */
@ObjectType()
export class ReviewView {
  @Field(() => Int)
  reviewId: number;

  @Field(() => Int)
  supplierId: number;

  @Field(() => Int)
  rating: number;

  @Field({ nullable: true })
  text?: string;

  /** "Andrea R." */
  @Field()
  reviewerName: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  /** True when the signed-in caller wrote it. */
  @Field()
  isMine: boolean;
}
