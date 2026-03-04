import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Language, Role } from '@prisma/client';
import { Subscription } from 'src/api/subscription/model';

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

  @Field()
  language?: string;

  @Field()
  country?: string;

  @Field()
  role?: string;

  @Field()
  profilePicture?: string;

  //additional models
  @Field(() => [Subscription], { nullable: true })
  subscription?: Subscription[];
}

registerEnumType(Language, {
  name: 'Language',
  description: 'Supported languages for users',
});

registerEnumType(Role, {
  name: 'Role',
  description: 'Supported roles for users',
});
