import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class MrrByDayArgs {
  @Field(() => Int)
  adminUserId: number;

  /** Window size in days, ending today (inclusive). Defaults to 30. */
  @Field(() => Int, { nullable: true, defaultValue: 30 })
  daysBack?: number;
}
