import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';

/**
 * Create or replace the signed-in customer's review of a supplier. A
 * customer has at most one review per supplier, so this is an upsert.
 */
@InputType()
export class ReviewInput {
  @Field(() => Int)
  supplierId: number;

  /** 1–5 stars. */
  @IsInt()
  @Min(1)
  @Max(5)
  @Field(() => Int)
  rating: number;

  @IsOptional()
  @MaxLength(2000)
  @Field({ nullable: true })
  text?: string;
}
