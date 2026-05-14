import { InputType, Field, Int } from '@nestjs/graphql';
import { MessageType } from '@prisma/client';

@InputType()
export class MessageSendInput {
  @Field(() => Int)
  conversationId: number;

  @Field(() => Int)
  senderUserId: number;

  @Field()
  content: string;

  @Field(() => MessageType, { nullable: true })
  messageType?: MessageType;
}
