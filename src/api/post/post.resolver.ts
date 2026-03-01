import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { PostService } from './post.service';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { Post, PostSelect } from './model';
import { PostCreateInput, PostArgs, PostUpdateInput } from './dto';

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @Mutation(() => Post)
  public async createPost(
    @Args('data') data: PostCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<PostSelect>,
  ): Promise<Post> {
    return await this.postService.create(data, fields);
  }

  @Query(() => [Post])
  public async postsBySupplier(
    @Args() args: PostArgs,
    @GraphQLFields() { fields }: IGraphQLFields<PostSelect>,
  ): Promise<Post[]> {
    return await this.postService.findPostBySupplier(args, fields);
  }

  @Query(() => Post)
  public async post(
    @Args() args: PostArgs,
    @GraphQLFields() { fields }: IGraphQLFields<PostSelect>,
  ): Promise<Post> {
    return await this.postService.findPost(args, fields);
  }

  @Mutation(() => Post)
  public async updatePost(
    @Args('data') data: PostUpdateInput,
    @Args() args: PostArgs,
    @GraphQLFields() { fields }: IGraphQLFields<PostSelect>,
  ): Promise<Post> {
    return await this.postService.updatePosts(data, args, fields);
  }
}
