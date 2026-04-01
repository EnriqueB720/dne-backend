import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Language, Role } from '@prisma/client';
import { Subscription } from 'src/api/subscription/model';
import { Supplier } from 'src/api/supplier/model';

//additional imports for users

@ObjectType()
export class User {
  @Field(() => Number)
  userId?: number;

  @Field()
  email?: string;

  @Field()
  name?: string;

  @Field()
  phone?: string;

  @Field(() => Language)
  language?: Language;

  @Field()
  country?: string;

  @Field(() => Role)
  role?: Role;

  @Field(() => String, { nullable: true })
  profilePicture?: string;

  //additional models
  @Field(() => [Subscription], { nullable: true })
  subscription?: Subscription[];

  @Field(() => [Supplier], { nullable: true })
  supplier?: Supplier[];
}

registerEnumType(Language, {
  name: 'Language',
  description: 'Supported languages for users',
});

registerEnumType(Role, {
  name: 'Role',
  description: 'Supported roles for users',
});
