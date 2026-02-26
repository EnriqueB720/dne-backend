import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class PostWhereInput {
  @Field(() => Int, { nullable: true })
  postId?: number;

  @Field(() => Int, { nullable: true })
  supplierId?: number;

  @Field(() => Int, { nullable: true })
  categoryId?: number;
}
