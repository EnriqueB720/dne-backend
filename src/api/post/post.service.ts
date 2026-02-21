import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { PostCreateInput } from './dto';
import { Post, PostSelect } from './model';

@Injectable()
export class PostService {
  constructor(private readonly prismaService: PrismaService) {}

  public async create(
    {mediaUrl, ...data}: PostCreateInput,
    { select }: PostSelect,
  ): Promise<Post> {
   const post = await this.prismaService.post.create({
      data:{
        ...data,
        media_url: mediaUrl,
      },
      select,
    });

    return {
      ...post,
      price: post.price.toString()
    }
  }
}
