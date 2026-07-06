import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * One row of the AI usage breakdown on the admin dashboard — grouped by
 * `model_name` over the requested rolling window.
 */
@ObjectType()
export class AiUsageBreakdownRow {
  @Field()
  modelName: string;

  @Field(() => Int)
  requests: number;

  @Field(() => Int)
  inputTokens: number;

  @Field(() => Int)
  outputTokens: number;

  /** Sum of `cost_usd` across the requests in the window. */
  @Field(() => String)
  costUsd: string;
}
