import { InputType, Field, Int } from '@nestjs/graphql';
import { QuoteItemInput } from './quote-item.input';
import { QuoteSlotInput } from './quote-slot.input';

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

  /**
   * Time windows the supplier is offering. The customer picks one when
   * accepting the quote. Optional — quotes without slots fall back to the
   * request's `serviceDate`.
   */
  @Field(() => [QuoteSlotInput], { nullable: true })
  offeredSlots?: QuoteSlotInput[];
}
