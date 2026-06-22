import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * Editable fields on a customer's profile (used by the /profile page).
 * Identity-level fields (name, phone, email) live on the linked User
 * record and are updated via `updateUser` instead.
 */
@InputType()
export class CustomerUpdateInput {
  @Field(() => Int)
  customerId: number;

  @Field({ nullable: true })
  defaultCity?: string;

  @Field({ nullable: true })
  defaultAddress?: string;

  @Field({ nullable: true })
  marketingOptIn?: boolean;
}
