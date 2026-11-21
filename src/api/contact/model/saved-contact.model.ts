import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * One supplier the signed-in customer has reached out to — the "saved
 * interactions" list on /dashboard. Grouped per supplier.
 */
@ObjectType()
export class SavedContact {
  @Field(() => Int)
  supplierId: number;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  province?: string;

  @Field({ nullable: true })
  businessPhone?: string;

  @Field({ nullable: true })
  whatsappNumber?: string;

  @Field({ nullable: true })
  businessEmail?: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  /** Most recent contact. */
  @Field()
  lastContactedAt: Date;

  /** How the customer last reached out (PHONE, WHATSAPP, …). */
  @Field()
  lastChannel: string;

  /** Distinct contacts (24h-deduped) with this supplier. */
  @Field(() => Int)
  contactCount: number;

  /** The customer's own rating, if they reviewed this supplier. */
  @Field(() => Int, { nullable: true })
  myRating?: number;
}
