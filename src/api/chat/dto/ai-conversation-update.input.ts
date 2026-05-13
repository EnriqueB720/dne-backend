import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_MODELS, SupportedModel } from './chat-request.dto';

@InputType()
export class AiConversationUpdateInput {
  @Field()
  @IsString()
  conversationId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(SUPPORTED_MODELS as unknown as string[])
  model?: SupportedModel;
}
