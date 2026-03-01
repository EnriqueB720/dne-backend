import { Query, Args, Mutation, Resolver } from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { Category, CategorySelect } from './model';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { CategoryArgs, CategoryCreateInput } from './dto';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Query(() => Category)
  public async category(
    @Args() args: CategoryArgs,
    @GraphQLFields() { fields }: IGraphQLFields<CategorySelect>,
  ): Promise<Category> {
    return await this.categoryService.findOne(args, fields);
  }

  @Mutation(() => Category)
  public async createCategory(
    @Args('data') data: CategoryCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<CategorySelect>,
  ): Promise<Category> {
    return await this.categoryService.create(data, fields);
  }
}
