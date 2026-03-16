import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CategoryCreateInput {
  @Field()
  categoryName: string;
}
