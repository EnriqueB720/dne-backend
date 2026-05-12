import { Field, InputType } from '@nestjs/graphql';

import { IsEmail, IsIn, IsOptional, MaxLength, MinLength } from 'class-validator';

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
  country: string;

  /** 'CUSTOMER' or 'SUPPLIER'. Defaults to 'CUSTOMER' if omitted. */
  @IsOptional()
  @IsIn(['CUSTOMER', 'SUPPLIER'])
  @Field({ nullable: true })
  role?: string;

  /** Required only when role === 'SUPPLIER'. */
  @IsOptional()
  @Field({ nullable: true })
  companyName?: string;

  @IsOptional()
  @Field({ nullable: true })
  profilePicture?: string;
}
