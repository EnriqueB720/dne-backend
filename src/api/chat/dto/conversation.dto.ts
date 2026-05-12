import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_MODELS, SupportedModel } from './chat-request.dto';

export class CreateConversationDto {
  @IsString()
  @MaxLength(128)
  deviceId: string;

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

  /** Optional system prompt override */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  system?: string;
}
