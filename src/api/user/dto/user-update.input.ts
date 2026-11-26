import { Field, InputType } from '@nestjs/graphql';
import { Language } from '@prisma/client';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Editable fields on the signed-in user's own account. Email is excluded —
 * changing it needs verification and belongs in a separate flow.
 */
@InputType()
export class UserUpdateInput {
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  @Field({ nullable: true })
  name?: string;

  @IsOptional()
  @MaxLength(30)
  @Field({ nullable: true })
  phone?: string;

  @Field(() => Language, { nullable: true })
  language?: Language;

  @Field({ nullable: true })
  profilePicture?: string;
}
