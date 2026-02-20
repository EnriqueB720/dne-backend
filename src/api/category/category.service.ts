import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';

@Injectable()
export class CategoryService {
  constructor(private readonly prismaService: PrismaService) {}

}
