import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class AdminStatsArgs {
  /**
   * The id of the user calling the query. The resolver verifies this user
   * has `isAdmin = true` before returning anything. Passed explicitly until
   * the auth-track lands resolver-level guards.
   */
  @Field(() => Int)
  adminUserId: number;
}
