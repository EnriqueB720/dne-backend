import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SupplierSearchInput {
  /** Free-text service description, e.g. "catering", "DJ", "photography". */
  @Field({ nullable: true })
  serviceQuery?: string;

  /** City the customer wants service in. Matches supplier.city OR a serviceArea.city. */
  @Field({ nullable: true })
  city?: string;

  /** Number of guests. Filters out suppliers whose min/maxCapacity exclude this count. */
  @Field(() => Int, { nullable: true })
  guestCount?: number;

  /** Optional category ID for tighter matching. */
  @Field(() => Int, { nullable: true })
  categoryId?: number;

  /** Max results to return. Defaults to 4. */
  @Field(() => Int, { nullable: true })
  limit?: number;
}
