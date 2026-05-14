import { Field, ObjectType } from '@nestjs/graphql';
import { AiMessageUsage } from './ai-message-usage.model';

/** Result of a stateless model completion (GraphQL `aiComplete` mutation). */
@ObjectType()
export class AiCompletionResult {
  @Field()
  content: string;

  @Field()
  model: string;

  @Field(() => AiMessageUsage, { nullable: true })
  usage?: AiMessageUsage;
}
