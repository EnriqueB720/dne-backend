import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';

@Injectable()
export class SupplierService {
  constructor(private readonly prismaService: PrismaService) {}

}
