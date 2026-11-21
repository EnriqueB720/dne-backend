import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsString()
  @MaxLength(12000)
  system?: string;

  /**
   * Stable system-prompt prefix eligible for provider-side prompt caching —
   * keep identical across turns. Per-turn context belongs in `system`.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(16000)
  cachedSystem?: string;
}
