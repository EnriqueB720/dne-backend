import { Resolver } from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { Category } from './model';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly CategoryService: CategoryService) {}


}
