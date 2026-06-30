import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PromotionTier } from '@prisma/client';

// Safe to call repeatedly — registerEnumType is idempotent per type.
registerEnumType(PromotionTier, { name: 'PromotionTier' });

/** Returned by the `setSupplierPromotion` mutation. */
@ObjectType()
export class SupplierPromotionResult {
  @Field(() => Int)
  supplierId: number;

  @Field(() => PromotionTier)
  promotionTier: PromotionTier;

  @Field({ nullable: true })
  promotionStartDate?: Date;

  @Field({ nullable: true })
  promotionEndDate?: Date;
}
