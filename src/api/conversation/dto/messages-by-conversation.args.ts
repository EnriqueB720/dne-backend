import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class MessagesByConversationArgs {
  @Field(() => Int)
  conversationId: number;

  /** Return at most this many messages (most recent). Defaults to 100. */
  @Field(() => Int, { nullable: true })
  limit?: number;
}
