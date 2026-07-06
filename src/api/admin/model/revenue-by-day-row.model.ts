import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * One day in the admin dashboard's revenue trend. `day` is the calendar
 * date in `YYYY-MM-DD` format (UTC); `platformFee` is the sum of
 * `Booking.platformFee` for that day's confirmed/completed bookings.
 */
@ObjectType()
export class RevenueByDayRow {
  @Field()
  day: string;

  @Field(() => String)
  platformFee: string;

  @Field(() => Int)
  bookings: number;
}
