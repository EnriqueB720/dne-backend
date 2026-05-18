import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ConversationArchiveInput {
  @Field(() => Int)
  conversationId: number;

  /** The user (customer's user OR supplier's user) archiving the conversation. */
  @Field(() => Int)
  userId: number;
}
