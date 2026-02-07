import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { User, UserSelect } from './model';
import { UserService } from './user.service';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { UserArgs, UserCreateInput } from './dto';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User)
  public async user(
    @Args() args: UserArgs,
    @GraphQLFields() { fields }: IGraphQLFields<UserSelect>,
  ): Promise<User> {
    return await this.userService.findOne(args, fields);
  }

  @Mutation(() => User)
  public async createUser(
    @Args('data') data: UserCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<UserSelect>,
  ): Promise<User> {
    return await this.userService.create(data, fields);
  }
}
