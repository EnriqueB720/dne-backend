import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { LeadSource } from '@prisma/client';

registerEnumType(LeadSource, {
  name: 'LeadSource',
  description: 'Where a contact-reveal lead was captured — the AI chat or a supplier storefront.',
});

/**
 * One row per time a customer reveals a supplier's contact info — the
 * "Contact" action on a provider card/chat reveal, or a contact link click
 * on the supplier's storefront. This is the unit of value Solvo sells
 * suppliers under the lead-gen model.
 */
@ObjectType()
export class LeadEvent {
  @Field(() => Int)
  leadEventId: number;

  @Field(() => Int)
  supplierId: number;

  @Field(() => Int, { nullable: true })
  customerId?: number;

  @Field(() => LeadSource)
  source: LeadSource;

  @Field()
  createdAt: Date;
}
