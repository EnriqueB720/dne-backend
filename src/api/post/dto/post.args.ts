import { ArgsType, Field } from '@nestjs/graphql';
import { PostWhereInput } from './post-where.input';

@ArgsType()
export class PostArgs {
  @Field(() => PostWhereInput)
  where: PostWhereInput;
}