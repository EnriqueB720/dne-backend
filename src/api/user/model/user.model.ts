import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Language } from '@prisma/client';

import { Supplier } from 'src/api/supplier/model';
import { Customer } from './customer.model';

@ObjectType()
export class User {
  @Field(() => Int)
  userId?: number;

  @Field()
  email?: string;

  @Field()
  name?: string;

  /** Null for social-login users until they finish onboarding. */
  @Field({ nullable: true })
  phone?: string;

  @Field(() => Language)
  language?: Language;

  /** ISO 3166-1 alpha-2. */
  @Field()
  country?: string;

  @Field(() => String, { nullable: true })
  profilePicture?: string;

  @Field({ nullable: true })
  isCustomer?: boolean;

  @Field({ nullable: true })
  isSupplier?: boolean;

  @Field({ nullable: true })
  isAdmin?: boolean;

  @Field({ nullable: true })
  createdAt?: Date;

  @Field(() => Supplier, { nullable: true })
  supplier?: Supplier;

  @Field(() => Customer, { nullable: true })
  customer?: Customer;
}

registerEnumType(Language, {
  name: 'Language',
  description: 'Supported languages for users',
});
