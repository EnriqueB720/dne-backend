import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_MODELS, SupportedModel } from './chat-request.dto';

@InputType()
export class AiMessageSendInput {
  @Field()
  @IsString()
  conversationId: string;

  @Field()
  @IsString()
  @MaxLength(8000)
  content: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model?: SupportedModel;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  system?: string;

  /**
   * Stable system-prompt prefix eligible for provider-side prompt caching —
   * keep identical across turns. Per-turn context belongs in `system`.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  cachedSystem?: string;
}
