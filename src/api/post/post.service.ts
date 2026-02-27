import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { PostArgs, PostCreateInput, PostUpdateInput } from './dto';
import { Post, PostSelect } from './model';

@Injectable()
export class PostService {
  constructor(private readonly prismaService: PrismaService) {}

  public async create(
    { mediaUrl, ...data }: PostCreateInput,
    { select }: PostSelect,
  ): Promise<Post> {
    const post = await this.prismaService.post.create({
      data: {
        ...data,
        media_url: mediaUrl,
      },
      select,
    });

    return this.parsePostPrice([post]) as Post;
  }

  public async findPostBySupplier(
    { where }: PostArgs,
    { select }: PostSelect,
  ): Promise<Post[]> {
    const posts = await this.prismaService.post.findMany({
      where,
      select,
    });

    return (this.parsePostPrice(posts) as Post[]) || [];
  }

  public async findPost(
    { whereUnique }: PostArgs,
    { select }: PostSelect,
  ): Promise<Post> {
    const post = await this.prismaService.post.findUnique({
      where: whereUnique,
      select,
    });

    if (!post) {
      throw new BadRequestException(
        'No post found with the given unique identifier',
      );
    }

    return this.parsePostPrice([post]) as Post;
  }

  public async updatePosts(
    data: PostUpdateInput,
    { whereUnique }: PostArgs,
    { select }: PostSelect,
  ): Promise<Post> {
    const post = await this.prismaService.post.update({
      where: whereUnique,
      data,
      select,
    });

    return this.parsePostPrice([post]) as Post;
  }

  /**
   * Receives an array of post objects and converts their price from Decimal to string.
   *
   * @param {any[]} posts - The array of post objects to process.
   * @returns {Post[] | Post} The processed posts with price as string.
   */
  public parsePostPrice(posts: any[]): Post[] | Post {
    let parsedPricePosts = posts.map((post) => {
      return {
        ...post,
        price: post.price.toString(),
      };
    });

    return parsedPricePosts.length === 1
      ? parsedPricePosts[0]
      : parsedPricePosts;
  }
}
