import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiMessage {
  @Field()
  messageId: string;

  @Field()
  conversationId: string;

  @Field()
  role: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  model?: string;

  @Field({ nullable: true })
  inputTokens?: number;

  @Field({ nullable: true })
  outputTokens?: number;

  @Field({ nullable: true })
  providersJson?: string;

  @Field()
  createdAt: Date;
}
