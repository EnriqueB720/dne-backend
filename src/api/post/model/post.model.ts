import { Field, ObjectType } from '@nestjs/graphql';
import { Category } from 'src/api/category/model';
import { Supplier } from 'src/api/supplier/model';

@ObjectType()
export class Post {
  @Field()
  postId: number;

  @Field(() => Supplier)
  supplier: Supplier;

  @Field(() => Category)
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
