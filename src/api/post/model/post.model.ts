import { Field, ObjectType } from '@nestjs/graphql';


@ObjectType()
export class Post {
  @Field()
  postId: number;

  // @Field()
  // supplier: Supplier; //TODO: link to Supplier model when model is created

  // @Field()
  // category: Category; //TODO: Link to category model when model is created

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