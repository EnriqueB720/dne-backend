import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { MessageType, SenderType } from '@prisma/client';

@ObjectType()
export class Message {
  @Field()
  messageId: number;

  @Field()
  conversationId: number;

  @Field(() => SenderType)
  senderType: SenderType;

  @Field({ nullable: true })
  senderUserId?: number;

  @Field()
  content: string;

  @Field(() => MessageType)
  messageType: MessageType;

  @Field()
  filtered: boolean;

  @Field({ nullable: true })
  filteredReason?: string;

  @Field({ nullable: true })
  readAt?: Date;

  @Field()
  createdAt: Date;
}

registerEnumType(SenderType, {
  name: 'SenderType',
  description: 'Who sent a message in a customer↔supplier conversation',
});

registerEnumType(MessageType, {
  name: 'MessageType',
  description: 'Format of a chat message',
});
