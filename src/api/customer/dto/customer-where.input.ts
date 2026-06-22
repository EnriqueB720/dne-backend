import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CustomerWhereInput {
  @Field(() => Int, { nullable: true })
  customerId?: number;

  @Field(() => Int, { nullable: true })
  userId?: number;
}
