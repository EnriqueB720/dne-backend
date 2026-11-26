import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser, GraphQLFields, IGraphQLFields } from '@decorators';
import { JwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';
import { UserUpdateInput } from './dto';
import { User, UserSelect } from './model';
import { UserService } from './user.service';

/** The signed-in user's own account. There is no way to read or edit someone else's. */
@Resolver(() => User)
@UseGuards(JwtAuthGuard)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User)
  public async me(
    @CurrentUser() user: IAuthUser,
    @GraphQLFields() { fields }: IGraphQLFields<UserSelect>,
  ): Promise<User> {
    return this.userService.findById(Number(user.sub), fields);
  }

  @Mutation(() => User)
  public async updateMe(
    @Args('data') data: UserUpdateInput,
    @CurrentUser() user: IAuthUser,
    @GraphQLFields() { fields }: IGraphQLFields<UserSelect>,
  ): Promise<User> {
    return this.userService.update(Number(user.sub), data, fields);
  }
}
