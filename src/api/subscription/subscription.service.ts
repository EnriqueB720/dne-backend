import { Injectable } from '@nestjs/common';
import { Subscription, SubscriptionSelect } from './model';
import {
  SubscriptionCreateInput,
  SubscriptionArgs,
  SubscriptionWhereInput,
} from './dto';
import { PrismaService } from '@prisma-datasource';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: SubscriptionArgs,
    { select }: SubscriptionSelect,
  ): Promise<Subscription> {
    return await this.prismaService.subscription.findFirst({
      where,
      select: {
        ...select,
        user: true,
        plan: true,
      },
    });
  }

  public async create(
    data: SubscriptionCreateInput,
    { select }: SubscriptionSelect,
  ): Promise<Subscription> {
    return await this.prismaService.subscription.create({
      data,
      select: {
        ...select,
        user: true,
        plan: true,
      },
    });
  }
}
