import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_MODELS, SupportedModel } from './chat-request.dto';

@InputType()
export class AiConversationCreateInput {
  @Field()
  @IsString()
  @MaxLength(255)
  title: string;

  @Field()
  @IsString()
  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model: SupportedModel;

  /**
   * Optional client-provided device id (used for guest / unauthenticated chats).
   * When the caller is authenticated, the resolver attaches the userId instead.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}
