import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ConversationRestoreInput {
  @Field(() => Int)
  conversationId: number;

  @Field(() => Int)
  userId: number;
}
