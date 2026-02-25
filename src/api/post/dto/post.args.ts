import { ArgsType, Field } from '@nestjs/graphql';
import { PostWhereInput } from './post-where.input';
import { PostWhereUniqueInput } from './post-where-unique.input';

@ArgsType()
export class PostArgs {
  @Field(() => PostWhereInput, { nullable: true })
  where?: PostWhereInput;

  @Field(() => PostWhereUniqueInput, { nullable: true })
  whereUnique?: PostWhereUniqueInput;
}