import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * One day in the admin dashboard's MRR trend. `day` is the calendar date
 * in `YYYY-MM-DD` format (UTC); `mrr` is the sum of each active paid
 * supplier subscription's monthly plan price whose [startDate, endDate]
 * window covers that day.
 */
@ObjectType()
export class MrrByDayRow {
  @Field()
  day: string;

  @Field(() => String)
  mrr: string;

  @Field(() => Int)
  paidSupplierCount: number;
}
