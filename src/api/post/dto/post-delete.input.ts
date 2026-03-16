import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PostDeleteInput {
  @Field(() => Int)
  postId: number;
}
