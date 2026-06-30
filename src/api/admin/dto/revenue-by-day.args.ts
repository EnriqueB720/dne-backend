import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class RevenueByDayArgs {
  @Field(() => Int)
  adminUserId: number;

  /**
   * Window size in days, ending today (inclusive). Defaults to 30. Days
   * with zero bookings are filled with `platformFee = "0"` and
   * `bookings = 0` so the chart renders a continuous strip.
   */
  @Field(() => Int, { nullable: true, defaultValue: 30 })
  daysBack?: number;
}
