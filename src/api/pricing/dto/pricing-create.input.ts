import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class PricingCreateInput {
  @Field()
  planName: string;

  @Field()
  price: number;

  @Field()
  features: string;
}
