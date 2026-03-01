import { ArgsType, Field } from '@nestjs/graphql';
import { CategoryWhereInput } from './category-where.input';

@ArgsType()
export class CategoryArgs {
  @Field(() => CategoryWhereInput)
  where: CategoryWhereInput;
}
