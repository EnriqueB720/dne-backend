
import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PostWhereUniqueInput {
  @Field(() => Int)
  postId: number;
}