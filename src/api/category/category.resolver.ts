import { Query, Resolver } from '@nestjs/graphql';

import { GraphQLFields, IGraphQLFields } from '@decorators';
import { CategoryService } from './category.service';
import { Category, CategorySelect } from './model';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Query(() => [Category])
  public async categories(
    @GraphQLFields() { fields }: IGraphQLFields<CategorySelect>,
  ): Promise<Category[]> {
    return this.categoryService.findMany(fields);
  }
}
