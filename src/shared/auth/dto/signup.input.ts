import { Field, InputType, Int } from '@nestjs/graphql';

import { IsEmail, MaxLength, MinLength } from 'class-validator';

@InputType()
export class SignUpInput {
  @IsEmail()
  @Field()
  email: string;

  @MinLength(4)
  @MaxLength(100)
  @Field()
  name: string;

  @MinLength(8)
  @Field()
  password: string;

  @Field()
  phone: string;

  @Field()
  language: string;

  @Field()
  country: string;
}
