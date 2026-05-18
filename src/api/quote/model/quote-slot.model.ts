import { Field, ObjectType } from '@nestjs/graphql';

/**
 * One offered time window on a quote. The supplier proposes a list of these;
 * the customer picks one when accepting the quote.
 *
 * Persisted on `Quote.offeredSlots` (Prisma `Json`) as an array of these
 * objects with `startsAt` / `endsAt` ISO strings.
 */
@ObjectType()
export class QuoteSlot {
  @Field()
  startsAt: Date;

  @Field()
  endsAt: Date;
}
