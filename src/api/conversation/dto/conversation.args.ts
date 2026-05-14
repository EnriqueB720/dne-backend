import { ArgsType, Field } from '@nestjs/graphql';
import { ConversationWhereInput } from './conversation-where.input';

@ArgsType()
export class ConversationArgs {
  @Field(() => ConversationWhereInput)
  where: ConversationWhereInput;
}
