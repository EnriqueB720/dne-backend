import { ArgsType, Field } from '@nestjs/graphql';
import { UserWhereInput } from './user-where.input';

@ArgsType()
export class UserArgs {
  @Field(() => UserWhereInput)
  where: UserWhereInput;
}
