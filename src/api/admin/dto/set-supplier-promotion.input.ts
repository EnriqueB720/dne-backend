import { Field, InputType, Int } from '@nestjs/graphql';
import { PromotionTier } from '@prisma/client';

/**
 * Admin flips a supplier's sponsored-placement tier. When clearing
 * (`tier = NONE`) the start/end dates are wiped. When setting
 * `tier = FEATURED`, the start date defaults to now if not provided.
 */
@InputType()
export class SetSupplierPromotionInput {
  @Field(() => Int)
  adminUserId: number;

  @Field(() => Int)
  supplierId: number;

  @Field(() => PromotionTier)
  tier: PromotionTier;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;
}
