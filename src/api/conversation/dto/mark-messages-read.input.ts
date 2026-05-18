import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class MarkMessagesReadInput {
  @Field(() => Int)
  conversationId: number;

  /** Messages sent by anyone OTHER than this user, that are still unread, get flipped to read. */
  @Field(() => Int)
  viewerUserId: number;
}
