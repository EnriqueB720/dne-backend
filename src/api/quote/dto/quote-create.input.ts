import { InputType, Field, Int } from '@nestjs/graphql';
import { QuoteItemInput } from './quote-item.input';

@InputType()
export class QuoteCreateInput {
  @Field(() => Int)
  requestId: number;

  @Field(() => Int)
  supplierId: number;

  @Field()
  totalPrice: number;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  message?: string;

  @Field()
  validUntil: Date;

  @Field(() => [QuoteItemInput], { nullable: true })
  items?: QuoteItemInput[];
}
