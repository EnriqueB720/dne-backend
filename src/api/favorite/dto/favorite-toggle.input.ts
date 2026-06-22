import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * Toggle a supplier in/out of the customer's saved list. If a Favorite row
 * exists for the (customerId, supplierId) pair it's removed; otherwise a
 * new row is created.
 */
@InputType()
export class FavoriteToggleInput {
  @Field(() => Int)
  customerId: number;

  @Field(() => Int)
  supplierId: number;

  @Field({ nullable: true })
  notes?: string;
}
