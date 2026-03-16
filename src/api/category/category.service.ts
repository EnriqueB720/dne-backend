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
