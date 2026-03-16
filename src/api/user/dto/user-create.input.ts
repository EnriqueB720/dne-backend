import { InputType, Field, Int } from '@nestjs/graphql';
import { Language, Role } from '@prisma/client';

import { IsEmail, MaxLength, MinLength } from 'class-validator';
import { SubscriptionCreateNestedInput } from 'src/api/subscription/dto/subscription-create-nested.input';
import { Subscription } from 'src/api/subscription/model';

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

  @Field()
  companyName: string;
  
  @Field({ nullable: true })
  profilePicture?: string;

  @Field(() => SubscriptionCreateNestedInput)
  subscription: SubscriptionCreateNestedInput;
}
