import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_MODELS, SupportedModel } from './chat-request.dto';

export class CreateConversationDto {
  /**
   * Optional from the GraphQL/auth path (the resolver supplies userId
   * instead). Still required when calling through the legacy REST routes
   * that only know about deviceId.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model: SupportedModel;
}

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model?: SupportedModel;
}

export class SendMessageDto {
  /** The user's raw message text */
  @IsString()
  @MaxLength(8000)
  content: string;

  /** Model to use for this turn; defaults to conversation's model */
  @IsOptional()
  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model?: SupportedModel;

  /** Per-turn (dynamic) system prompt — never cached */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  system?: string;

  /** Stable system-prompt prefix eligible for provider-side prompt caching */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  cachedSystem?: string;
}
