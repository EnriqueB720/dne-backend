import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Lightweight payload for the `messageEventForConversation` subscription.
 * Subscribers use it as a trigger to refetch the conversation's message
 * list — the payload deliberately doesn't carry the full Message body.
 */
@ObjectType()
export class MessageEvent {
  @Field()
  eventType: string;

  @Field(() => Int)
  conversationId: number;

  @Field(() => Int)
  messageId: number;

  @Field(() => Int)
  senderUserId: number;
}
