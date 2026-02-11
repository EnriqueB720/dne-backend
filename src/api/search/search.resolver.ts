import { Resolver, Query, Args } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { Search, SearchSelect } from './model';
import { SearchArgs } from './dto';

@Resolver(() => Search)
export class SearchResolver {
  constructor(private readonly SearchService: SearchService) {}

  @Query(() => Search)
  public async search(
    @Args() args: SearchArgs,
    @GraphQLFields() { fields }: IGraphQLFields<SearchSelect>,
  ): Promise<Search> {
    return this.SearchService.search(args, fields);
  }

}
