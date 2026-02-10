import { InputType, Field, Int } from '@nestjs/graphql';
import { Language, Role } from '@prisma/client';

import { IsEmail, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UserCreateInput {
  @IsEmail()
  @MaxLength(100)
  @Field()
  email: string;

  @MaxLength(50)
  @MinLength(8)
  @Field()
  password: string;

  @Field()
  name: string;

  @Field()
  phone: string;

  @Field()
  country: string;

  @Field(() => Role)
  role: Role;
}
