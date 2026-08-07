import { Field, InputType, Int } from '@nestjs/graphql';
import { PricingModel } from '@prisma/client';

/**
 * A service line on a supplier's storefront, created from the provider
 * settings page. Mirrors what the public profile renders: name, blurb,
 * and a "From ₡X" price.
 */
@InputType()
export class ServiceCreateInput {
  @Field(() => Int)
  supplierId: number;

  @Field(() => Int)
  categoryId: number;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => PricingModel, { nullable: true })
  pricingModel?: PricingModel;

  /** Decimal-as-string — GraphQL has no arbitrary-precision number type. */
  @Field(() => String)
  basePrice: string;

  @Field({ nullable: true })
  currency?: string;

  @Field(() => String, { nullable: true })
  minTotalPrice?: string;

  @Field(() => String, { nullable: true })
  maxTotalPrice?: string;

  @Field(() => Int, { nullable: true })
  minUnits?: number;

  @Field(() => Int, { nullable: true })
  maxUnits?: number;

  /** What one unit means for this service — "person", "hour", "day". */
  @Field({ nullable: true })
  unitLabel?: string;

  @Field({ nullable: true })
  active?: boolean;
}
