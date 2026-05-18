import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ConversationWhereInput {
  @Field(() => Int, { nullable: true })
  conversationId?: number;
}
