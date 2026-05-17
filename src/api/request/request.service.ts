import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';

import { PrismaService } from '@prisma-datasource';
import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import { NotificationService } from '../notification/notification.service';
import {
  OpenRequestsForSupplierArgs,
  RequestArgs,
  RequestCloseInput,
  RequestCreateInput,
  RequestListArgs,
  RequestsBySupplierArgs,
  RequestUpdateStatusInput,
} from './dto';
import { Request, RequestSelect } from './model';

/** PubSub channels for request lifecycle events. */
export const REQUEST_EVENT_CHANNEL = 'REQUEST_EVENT';
export const OPEN_REQUEST_EVENT_CHANNEL = 'OPEN_REQUEST_EVENT';
export type RequestEventType = 'CREATED' | 'STATUS_CHANGED' | 'CLOSED' | 'BOOKED';

@Injectable()
export class RequestService {
  private readonly logger = new Logger(RequestService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  /** Publish a customer-scoped request event (their list/detail refetches). */
  private async publishRequestEvent(
    eventType: RequestEventType,
    requestId: number,
    customerId: number,
  ): Promise<void> {
    void this.pubSub.publish(REQUEST_EVENT_CHANNEL, {
      requestEvent: { eventType, requestId },
      customerId,
    });
  }

  /** Publish per-supplier "open lead" events for every matched supplier. */
  private async publishOpenRequestEvents(
    requestId: number,
    supplierUserPairs: Array<{ supplierId: number }>,
  ): Promise<void> {
    await Promise.all(
      supplierUserPairs.map((s) =>
        this.pubSub.publish(OPEN_REQUEST_EVENT_CHANNEL, {
          requestEvent: { eventType: 'CREATED', requestId },
          supplierId: s.supplierId,
        }),
      ),
    );
  }

  /**
   * Shared matching predicate used both by the new-request notification
   * fan-out and by `openRequestsForSupplier`. Kept permissive on purpose:
   *
   * - City: case-insensitive equal when BOTH the request and the supplier
   *   have one set. If either is missing, the city filter is dropped
   *   entirely (everyone sees it).
   * - Category: not enforced. Suppliers self-filter via their inbox.
   *   This avoids the common dev/test trap where a supplier has no
   *   categories and therefore never gets notified.
   *
   * Refine later (semantic embedding, distance ranking, …).
   */
  private matchPredicateForRequest(input: {
    city?: string | null;
  }): Prisma.SupplierWhereInput {
    if (!input.city) return {};
    return {
      OR: [
        { city: { equals: input.city, mode: 'insensitive' } },
        { city: null },
      ],
    };
  }

  private matchPredicateForSupplier(supplier: {
    city: string | null;
  }): Prisma.RequestWhereInput {
    if (!supplier.city) return {};
    return {
      OR: [
        { city: { equals: supplier.city, mode: 'insensitive' } },
        { city: null },
      ],
    };
  }

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

  /**
   * Returns the requests where the given supplier has at least one quote.
   * This is the supplier-side view of "their" requests.
   */
  public async findManyBySupplier(
    { supplierId, status }: RequestsBySupplierArgs,
    { select }: RequestSelect,
  ): Promise<Request[]> {
    return await this.prismaService.request.findMany({
      where: {
        ...(status && { status }),
        quotes: { some: { supplierId } },
      },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  /**
   * "Open leads" for a supplier — requests that look like a match (same city
   * as the supplier, sharing at least one category if the request has one)
   * and that the supplier hasn't quoted on yet. Same matching logic used
   * for the new-request notification fan-out.
   */
  public async findOpenForSupplier(
    { supplierId, limit }: OpenRequestsForSupplierArgs,
    { select }: RequestSelect,
  ): Promise<Request[]> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { supplierId },
      select: { city: true },
    });
    if (!supplier) return [];

    return await this.prismaService.request.findMany({
      where: {
        // Only requests still in the "looking for quotes" lifecycle
        status: { in: [RequestStatus.MATCHING, RequestStatus.AWAITING_QUOTES, RequestStatus.QUOTES_RECEIVED] },
        // Same permissive city match used by the notification fan-out so
        // the supplier sees in Open leads exactly what they got pinged about.
        ...this.matchPredicateForSupplier(supplier),
        // Hide requests the supplier has already quoted on
        quotes: { none: { supplierId } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit && limit > 0 ? limit : 50,
      select,
    });
  }

  public async create(
    data: RequestCreateInput,
    { select }: RequestSelect,
  ): Promise<Request> {
    const request = await this.prismaService.request.create({
      data: {
        ...data,
        status: RequestStatus.MATCHING,
        isComplete: true,
      },
      select,
    });

    // Fan out a `NEW_REQUEST_MATCH` notification to suppliers that look like
    // a match. v1 matching is intentionally simple: same city, and (if the
    // request specified a category) at least one service in that category.
    // Refine with embeddings / ranking later.
    void this.notifyMatchedSuppliers(request, data);

    // Live events — customer's own list refetches, matched suppliers' Open
    // leads inbox refetches (covered inside notifyMatchedSuppliers via the
    // open-request channel).
    const requestId = (request as any).requestId as number | undefined;
    if (requestId) {
      await this.publishRequestEvent('CREATED', requestId, data.customerId);
    }

    return request;
  }

  private async notifyMatchedSuppliers(
    request: Request,
    input: RequestCreateInput,
  ): Promise<void> {
    const requestId = (request as any).requestId as number | undefined;
    if (!requestId) return;

    try {
      const suppliers = await this.prismaService.supplier.findMany({
        where: this.matchPredicateForRequest({ city: input.city ?? null }),
        select: { userId: true, supplierId: true, city: true },
        take: 50,
      });

      this.logger.log(
        `Request ${requestId} created (city=${input.city ?? 'none'}) → notifying ${suppliers.length} supplier(s)`,
      );

      const preview = input.rawQuery.slice(0, 120);
      await Promise.all(
        suppliers.map((s) =>
          this.notificationService.emit({
            userId: s.userId,
            template: 'NEW_REQUEST_MATCH',
            subject: 'New request matches your services',
            body: `A customer is looking for help — "${preview}${input.rawQuery.length > 120 ? '…' : ''}"`,
            entityType: 'Request',
            entityId: requestId,
          }),
        ),
      );

      // Push live "new open lead" events so each matched supplier's
      // Open leads inbox refetches without waiting on its poll.
      await this.publishOpenRequestEvents(requestId, suppliers);
    } catch (err) {
      // Notification fan-out is best-effort — never fail the parent request
      // creation because the bell didn't ring.
      this.logger.warn(`Notification fan-out failed for request ${requestId}: ${(err as Error).message}`);
    }
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
    // Resolve customerId separately so we can publish the event regardless of
    // what the caller selected in the returned payload.
    const existing = await this.prismaService.request.findUnique({
      where: { requestId },
      select: { customerId: true },
    });

    const closed = await this.prismaService.request.update({
      where: { requestId },
      data: {
        status: RequestStatus.CLOSED,
        closedAt: new Date(),
        closedReason: reason,
      },
      select,
    });

    if (existing) {
      await this.publishRequestEvent('CLOSED', requestId, existing.customerId);
    }

    return closed;
  }
}
