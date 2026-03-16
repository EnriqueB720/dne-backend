import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { SupplierArgs, SupplierCreateInput } from './dto';
import { Supplier, SupplierSelect } from './model';

@Injectable()
export class SupplierService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: SupplierArgs,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    return await this.prismaService.supplier.findFirst({
      where,
      select: {
        ...select,
        user: true,
        post: true,
      },
    });
  }

  public async create(
    data: SupplierCreateInput,
    { select }: SupplierSelect,
  ): Promise<Supplier> {
    return await this.prismaService.supplier.create({
      data,
      select: {
        ...select,
        user: true,
        post: true,
      },
    });
  }

  async companyNameExists(companyName: string): Promise<boolean> {
    const supplier = await this.prismaService.supplier.findFirst({
      where: {
        companyName: { contains: companyName, mode: 'insensitive' },
      },
      select: {
        supplierId: true,
      },
    });

    return !!supplier;
  }
}
