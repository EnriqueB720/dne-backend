import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/api/user/model';

@ObjectType()
export class Customer {
  @Field()
  customerId: number;

  @Field()
  userId: number;

  @Field({ nullable: true })
  defaultCity?: string;

  @Field()
  marketingOptIn: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => User, { nullable: true })
  user?: User;
}
