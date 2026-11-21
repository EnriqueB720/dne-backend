import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { Category, CategorySelect } from './model';

@Injectable()
export class CategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Active categories in display order. Categories are seeded by migrations. */
  public async findMany({ select }: CategorySelect): Promise<Category[]> {
    return (await this.prismaService.category.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: 'asc' }, { nameEs: 'asc' }],
      select,
    })) as Category[];
  }
}
