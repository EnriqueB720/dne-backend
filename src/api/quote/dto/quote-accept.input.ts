import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class QuoteAcceptInput {
  @Field(() => Int)
  quoteId: number;

  /**
   * Which entry of the quote's `offeredSlots` the customer picked. Optional
   * for backwards-compatibility with quotes that have no slot list — in that
   * case the booking falls back to the request's `serviceDate`.
   */
  @Field(() => Int, { nullable: true })
  slotIndex?: number;
}
