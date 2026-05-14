import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SUPPORTED_MODELS, SupportedModel } from './chat-request.dto';

@InputType()
export class AiChatMessageInput {
  @Field()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @Field()
  @IsString()
  @MaxLength(8000)
  content: string;
}

/**
 * GraphQL input for a raw, stateless model completion — the GraphQL
 * equivalent of the legacy `POST /chat` REST endpoint. Used by the parser
 * and provider-generation flows that don't persist a conversation.
 */
@InputType()
export class AiCompletionInput {
  @Field()
  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model: SupportedModel;

  @Field(() => [AiChatMessageInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AiChatMessageInput)
  messages: AiChatMessageInput[];

  /** Per-turn (dynamic) system prompt — never cached. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  system?: string;

  /** Stable system-prompt prefix eligible for provider-side prompt caching. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  cachedSystem?: string;
}
