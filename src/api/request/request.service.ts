import { Injectable } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';

import { PrismaService } from '@prisma-datasource';
import {
  RequestArgs,
  RequestCloseInput,
  RequestCreateInput,
  RequestListArgs,
  RequestUpdateStatusInput,
} from './dto';
import { Request, RequestSelect } from './model';

@Injectable()
export class RequestService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findOne(
    { where }: RequestArgs,
    { select }: RequestSelect,
  ): Promise<Request> {
    return await this.prismaService.request.findFirst({
      where,
      select,
    });
  }

  public async findManyByCustomer(
    { customerId, status }: RequestListArgs,
    { select }: RequestSelect,
  ): Promise<Request[]> {
    return await this.prismaService.request.findMany({
      where: { customerId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  public async create(
    data: RequestCreateInput,
    { select }: RequestSelect,
  ): Promise<Request> {
    return await this.prismaService.request.create({
      data: {
        ...data,
        status: RequestStatus.MATCHING,
        isComplete: true,
      },
      select,
    });
  }

  public async updateStatus(
    { requestId, status }: RequestUpdateStatusInput,
    { select }: RequestSelect,
  ): Promise<Request> {
    return await this.prismaService.request.update({
      where: { requestId },
      data: { status },
      select,
    });
  }

  public async close(
    { requestId, reason }: RequestCloseInput,
    { select }: RequestSelect,
  ): Promise<Request> {
    return await this.prismaService.request.update({
      where: { requestId },
      data: {
        status: RequestStatus.CLOSED,
        closedAt: new Date(),
        closedReason: reason,
      },
      select,
    });
  }
}
