import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { Search, SearchSelect } from './model';
import { SearchArgs } from './dto';
import { PostService } from '../post/post.service';
import { Post } from '../post/model';

@Injectable()
export class SearchService {
  constructor(private readonly prismaService: PrismaService,
              private readonly postService: PostService
  ) {}

  public async search(
    { query, skip, take }: SearchArgs,
    { select }: SearchSelect = {},
  ): Promise<Search> {
    const prismaSelect = select?.post?.select;
    
    const posts = await this.prismaService.post.findMany({
      where: query ? {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { category: { categoryName: { contains: query, mode: 'insensitive' } } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      } : undefined,
      select: prismaSelect,
      skip: skip || 0,
      take: take || 10,
    });
    
    //Sending price as a string on UI to avoid precision loss when converting from Decimal to Float in JS
    const fixedPricePosts = this.postService.parsePostPrice(posts) as Post[];
    
    return { post: fixedPricePosts };
  }
}
