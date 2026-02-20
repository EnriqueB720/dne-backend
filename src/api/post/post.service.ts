import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';

@Injectable()
export class PostService {
  constructor(private readonly prismaService: PrismaService) {}

  
}