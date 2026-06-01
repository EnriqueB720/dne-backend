import { ArgsType, Field } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@ArgsType()
export class AiConversationArgs {
  @Field()
  @IsString()
  conversationId: string;
}
