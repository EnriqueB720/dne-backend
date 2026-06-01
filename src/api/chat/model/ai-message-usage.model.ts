import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiMessageUsage {
  @Field({ nullable: true })
  inputTokens?: number;

  @Field({ nullable: true })
  outputTokens?: number;
}

@ObjectType()
export class SendAiMessageResult {
  @Field()
  messageId: string;

  @Field()
  role: string;

  @Field()
  content: string;

  @Field()
  model: string;

  @Field(() => AiMessageUsage, { nullable: true })
  usage?: AiMessageUsage;

  @Field()
  createdAt: Date;
}
