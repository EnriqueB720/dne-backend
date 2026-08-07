import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { CategoryArgs, CategoryCreateInput } from './dto';
import { Category, CategorySelect } from './model';

@Injectable()
export class CategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: CategoryArgs,
    { select }: CategorySelect,
  ): Promise<Category> {
    return await this.prismaService.category.findFirst({
      where,
      select,
    });
  }

  /** Active categories for pickers (e.g. tagging a service on the settings page). */
  public async findMany({ select }: CategorySelect): Promise<Category[]> {
    return await this.prismaService.category.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: 'asc' }, { categoryName: 'asc' }],
      select,
    });
  }

  public async create(
    data: CategoryCreateInput,
    { select }: CategorySelect,
  ): Promise<Category> {
    return await this.prismaService.category.create({
      data,
      select,
    });
  }
}
