import { Field, Int, ObjectType } from '@nestjs/graphql';

/** A signed-in customer's profile — the anchor for their reviews and contacts. */
@ObjectType()
export class Customer {
  @Field(() => Int)
  customerId?: number;

  @Field(() => Int, { nullable: true })
  userId?: number;
}
