import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { Search, SearchSelect } from './model';
import { SearchArgs } from './dto';

@Injectable()
export class SearchService {
  constructor(private readonly prismaService: PrismaService) {}

  public async search(
    { search }: SearchArgs,
    { select }: SearchSelect,
  ): Promise<Search> {
    const posts = await this.prismaService.post.findMany({
      where: {
        OR: [
          { title: { contains: search.query, mode: 'insensitive' } },
          { category: { categoryName: { contains: search.query, mode: 'insensitive' } } },
          { description: { contains: search.query, mode: 'insensitive' } },
        ],
      },
      select: select?.post.select,
    });
    
    const fixedPricePosts = posts.map(post => {
      return {
        ...post,
        price: post.price.toString()
      }
    })
    
    return { Post: fixedPricePosts };
  }
}
