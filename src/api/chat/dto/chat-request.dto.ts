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
import { ChatMessageDto } from './chat-message.dto';

export const SUPPORTED_MODELS = [
  'gemini-flash',
  'claude-haiku',
  'gpt-4o-mini',
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export class ChatRequestDto {
  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model: SupportedModel;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  system?: string;

  /**
   * Stable system-prompt prefix eligible for provider-side prompt caching.
   * Keep this identical across turns for cache hits; put per-turn context
   * in `system` instead.
   */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  cachedSystem?: string;
}
