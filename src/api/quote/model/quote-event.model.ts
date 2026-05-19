import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Lightweight payload sent on the `quoteEventForCustomer` /
 * `quoteEventForSupplier` GraphQL subscriptions. Subscribers use it as a
 * trigger to refetch their existing list/detail queries — the payload
 * deliberately doesn't carry the full Quote shape.
 */
@ObjectType()
export class QuoteEvent {
  @Field()
  eventType: string;

  @Field(() => Int)
  quoteId: number;

  @Field(() => Int)
  requestId: number;
}
