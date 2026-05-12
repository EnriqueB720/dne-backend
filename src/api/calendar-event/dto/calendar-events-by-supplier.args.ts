import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class CalendarEventsBySupplierArgs {
  @Field(() => Int)
  supplierId: number;

  /** Inclusive lower bound — only events with endsAt >= from are returned. */
  @Field({ nullable: true })
  from?: Date;

  /** Exclusive upper bound — only events with startsAt < to are returned. */
  @Field({ nullable: true })
  to?: Date;
}
