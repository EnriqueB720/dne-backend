import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsString } from 'class-validator';

/**
 * Links an AI conversation to the Request it produced — set when the user
 * picks a provider ("Select") and a Request is created from that chat. This
 * connects the AI front-end to the Request → Quote → Booking pipeline.
 */
@InputType()
export class AiConversationLinkInput {
  @Field()
  @IsString()
  conversationId: string;

  @Field(() => Int)
  @IsInt()
  requestId: number;
}
