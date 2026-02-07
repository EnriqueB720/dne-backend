import { InputType, Field, Int } from '@nestjs/graphql';

import { isEmail, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UserCreateInput {
  @isEmail()
  @MaxLength(100)
  @Field()
  email: string;

  @MaxLength(50)
  @MinLength(8)
  @Field()
  password: string;

  @Field
  name: string;

  @Field
  phone: string;

  @Field
  language: string;

  @Field
  country: string;

  @Field
  role: string;
}
