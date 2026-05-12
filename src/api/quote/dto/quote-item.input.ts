import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class QuoteItemInput {
  @Field(() => Int, { nullable: true })
  serviceId?: number;

  @Field()
  description: string;

  @Field()
  quantity: number;

  @Field()
  unitPrice: number;

  @Field()
  total: number;
}
