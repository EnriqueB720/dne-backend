import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Category {
  @Field()
  categoryId: number;

  @Field()
  categoryName: string;
}
