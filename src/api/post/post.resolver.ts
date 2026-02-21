import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { PostService } from './post.service';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { Post, PostSelect } from './model';
import { PostCreateInput } from './dto';

@Resolver(() => Post)
export class PostResolver{

  constructor(private readonly postService: PostService) {}

  @Mutation(() => Post)
    public async createPost(
      @Args('data') data: PostCreateInput,
      @GraphQLFields() { fields }: IGraphQLFields<PostSelect>,
    ): Promise<Post> {
      return await this.postService.create(data, fields);
    }


}