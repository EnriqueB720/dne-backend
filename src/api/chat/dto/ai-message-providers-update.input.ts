import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class AiMessageProvidersUpdateInput {
  @Field()
  @IsString()
  conversationId: string;

  @Field()
  @IsString()
  messageId: string;

  @Field()
  @IsString()
  providersJson: string;
}
