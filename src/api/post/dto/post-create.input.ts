import { InputType, Field, Int } from "@nestjs/graphql";


@InputType()
export class PostCreateInput {

  @Field()
  title: string;

  @Field(() => Int)
  categoryId: number;

  @Field(() => Int)
  supplierId: number;

  @Field()
  description: string;

  @Field(() => Int)
  price: number;

  @Field()
  mediaUrl: string;

}