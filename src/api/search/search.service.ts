import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { Search, SearchSelect } from './model';
import { SearchArgs } from './dto';

@Injectable()
export class SearchService {
  constructor(private readonly prismaService: PrismaService) {}

  public async search(
    { query, skip, take }: SearchArgs,
    { select }: SearchSelect,
  ): Promise<Search> {
    const posts = await this.prismaService.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { category: { categoryName: { contains: query, mode: 'insensitive' } } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: select?.post.select,
      skip,
      take,
    });
    
    //Sending price as a string on UI to avoid precision loss when converting from Decimal to Float in JS
    const fixedPricePosts = posts.map(post => {
      return {
        ...post,
        price: post.price.toString()
      }
    })
    
    return { Post: fixedPricePosts };
  }
}
