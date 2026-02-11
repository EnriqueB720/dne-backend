import { Field, ObjectType } from '@nestjs/graphql';
import { Category, Supplier } from '@prisma/client';


@ObjectType()
export class Post {
  @Field()
  postId: number;

  @Field()
  supplier: Supplier; //TODO: link to Supplier model when model is created

  @Field()
  category: Category;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  price: string;

  @Field()
  createdAt: Date;

  @Field()
  media_url: string;
}