import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * Editable fields on a supplier's own business profile (used by the
 * /provider/settings page).
 */
@InputType()
export class SupplierUpdateInput {
  @Field(() => Int)
  supplierId: number;

  @Field({ nullable: true })
  companyName?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  tagline?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  businessPhone?: string;

  @Field({ nullable: true })
  businessEmail?: string;

  @Field({ nullable: true })
  whatsappNumber?: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  address?: string;

  @Field(() => Int, { nullable: true })
  minCapacity?: number;

  @Field(() => Int, { nullable: true })
  maxCapacity?: number;
}
