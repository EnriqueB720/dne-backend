import { Field, InputType, Int } from '@nestjs/graphql';
import { LeadSource } from '@prisma/client';

@InputType()
export class LeadEventCreateInput {
  @Field(() => Int)
  supplierId: number;

  /** Omitted for an anonymous/unauthenticated customer. */
  @Field(() => Int, { nullable: true })
  customerId?: number;

  @Field(() => LeadSource, { nullable: true, defaultValue: LeadSource.CHAT })
  source?: LeadSource;
}
