import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class AiUsageBreakdownArgs {
  @Field(() => Int)
  adminUserId: number;

  /**
   * Rolling window size in days. Defaults to 30. The dashboard typically
   * shows 7/30/all-time via separate calls.
   */
  @Field(() => Int, { nullable: true, defaultValue: 30 })
  daysBack?: number;
}
