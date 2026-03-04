import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class PostUpdateInput {
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  price?: number;

  @Field({ nullable: true })
  mediaUrl?: string;
}
