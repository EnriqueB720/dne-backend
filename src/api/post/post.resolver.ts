import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { PostService } from './post.service';
import { GraphQLFields, IGraphQLFields } from '@decorators';
import { Post } from './model';

@Resolver(() => Post)
export class PostResolver{

  constructor(private readonly PostService: PostService) {}




}