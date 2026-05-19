import { ArgsType, Field, Int } from '@nestjs/graphql';
import { ConversationStatus } from '@prisma/client';

@ArgsType()
export class ConversationsByCustomerArgs {
  @Field(() => Int)
  customerId: number;

  /** Required for per-user filtering — the viewer's userId. */
  @Field(() => Int)
  viewerUserId: number;

  /**
   * ACTIVE = conversations the viewer hasn't archived for themselves.
   * ARCHIVED = conversations this viewer has archived.
   * BLOCKED filter is global (rare).
   */
  @Field(() => ConversationStatus, { nullable: true })
  status?: ConversationStatus;
}
