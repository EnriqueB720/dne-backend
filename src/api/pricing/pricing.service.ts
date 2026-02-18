import { Injectable } from '@nestjs/common';
import { Pricing, PricingSelect } from './model';
import { PricingArgs, PricingWhereInput, PricingCreateInput } from './dto';
import { PrismaService } from '@prisma-datasource';

@Injectable()
export class PricingService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: PricingArgs,
    { select }: PricingSelect,
  ): Promise<Pricing> {
    return await this.prismaService.pricingPlan.findFirst({
      where,
      select,
    });
  }

  public async create(
    data: PricingCreateInput,
    { select }: PricingSelect,
  ): Promise<Pricing> {
    return await this.prismaService.pricingPlan.create({
      data,
      select,
    });
  }
}
