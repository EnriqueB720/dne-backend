import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CategoryWhereInput {
  @Field(() => Int, { nullable: true })
  categoryId?: number;
}
