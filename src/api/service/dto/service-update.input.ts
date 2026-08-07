import { Field, InputType, Int } from '@nestjs/graphql';
import { PricingModel } from '@prisma/client';

/**
 * Full-replace update: the settings form always sends the complete set of
 * fields, so omitted optional values (unit range, price range, unit label)
 * are cleared rather than kept.
 */
@InputType()
export class ServiceUpdateInput {
  @Field(() => Int)
  serviceId: number;

  /** Must own the service — enforced by the service layer. */
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

  @Field({ nullable: true })
  unitLabel?: string;

  @Field({ nullable: true })
  active?: boolean;
}
