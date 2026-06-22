import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-datasource';
import { CustomerArgs, CustomerUpdateInput } from './dto';
import { Customer, CustomerSelect } from './model';

@Injectable()
export class CustomerService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: CustomerArgs,
    { select }: CustomerSelect,
  ): Promise<Customer> {
    return await this.prismaService.customer.findFirst({
      where,
      select,
    });
  }

  public async update(
    { customerId, ...data }: CustomerUpdateInput,
    { select }: CustomerSelect,
  ): Promise<Customer> {
    return await this.prismaService.customer.update({
      where: { customerId },
      data,
      select,
    });
  }
}
