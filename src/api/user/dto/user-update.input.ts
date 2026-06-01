import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * Editable fields on the user's own profile. Identity (email) is excluded —
 * email changes need verification and should land in a separate flow.
 */
@InputType()
export class UserUpdateInput {
  @Field(() => Int)
  userId: number;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  profilePicture?: string;
}
