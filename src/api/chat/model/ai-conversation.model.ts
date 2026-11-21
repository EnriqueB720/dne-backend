import { Field, ObjectType } from '@nestjs/graphql';
import { AiMessage } from './ai-message.model';

@ObjectType()
export class AiConversation {
  @Field()
  conversationId: string;

  @Field()
  title: string;

  @Field()
  deviceId: string;

  @Field({ nullable: true })
  userId?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [AiMessage], { nullable: true })
  messages?: AiMessage[];
}
