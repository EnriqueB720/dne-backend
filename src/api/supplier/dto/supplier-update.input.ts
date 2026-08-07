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

  /** Optional second phone / email — the settings form allows up to two of each. */
  @Field({ nullable: true })
  businessPhoneAlt?: string;

  @Field({ nullable: true })
  businessEmailAlt?: string;

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

  /**
   * Typical first-reply time, in minutes. Self-declared — it drives the
   * "Replies in ~N min" line on the storefront. The dashboard's response
   * *rate* is the measured number; this one is a promise, not a metric.
   */
  @Field(() => Int, { nullable: true })
  responseTimeMinutes?: number;
}
