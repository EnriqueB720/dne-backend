import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { FavoriteService } from './favorite.service';
import {
  Favorite,
  FavoriteSelect,
  FavoriteToggleResult,
} from './model';
import { FavoriteToggleInput, FavoritesByCustomerArgs } from './dto';

@Resolver(() => Favorite)
export class FavoriteResolver {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Query(() => [Favorite])
  public async favoritesByCustomer(
    @Args() args: FavoritesByCustomerArgs,
    @GraphQLFields() { fields }: IGraphQLFields<FavoriteSelect>,
  ): Promise<Favorite[]> {
    return await this.favoriteService.findManyByCustomer(args, fields);
  }

  @Mutation(() => FavoriteToggleResult)
  public async toggleFavorite(
    @Args('data') data: FavoriteToggleInput,
  ): Promise<FavoriteToggleResult> {
    return await this.favoriteService.toggle(data);
  }
}
