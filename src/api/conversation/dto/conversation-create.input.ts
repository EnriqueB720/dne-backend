import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ConversationCreateInput {
  @Field(() => Int)
  requestId: number;

  @Field(() => Int)
  supplierId: number;
}
