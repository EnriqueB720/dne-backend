import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class RequestCreateInput {
  @Field(() => Int)
  customerId: number;

  @Field()
  rawQuery: string;

  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  serviceDate?: Date;

  @Field(() => Int, { nullable: true })
  guestCount?: number;

  @Field({ nullable: true })
  budgetMin?: number;

  @Field({ nullable: true })
  budgetMax?: number;

  @Field(() => Int, { nullable: true })
  conversationTurns?: number;

  @Field({ nullable: true })
  expiresAt?: Date;
}
