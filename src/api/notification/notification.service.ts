import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';

import { PrismaService } from '@prisma-datasource';
import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import {
  NotificationMarkReadInput,
  NotificationsByUserArgs,
  NotificationsMarkAllReadInput,
} from './dto';
import { Notification, NotificationSelect } from './model';

/** Event name used by the `notificationCreated` GraphQL subscription. */
export const NOTIFICATION_CREATED_EVENT = 'notificationCreated';

/**
 * Shape of a "new notification" emission. Any service can call
 * `NotificationService.emit(...)` to fan out a notification to a single user.
 *
 * For v1 we only persist `IN_APP` notifications. Other channels (email, push,
 * WhatsApp) will use the same model but go through transport workers.
 */
export interface NotificationEmitInput {
  userId: number;
  template: string;
  body: string;
  subject?: string;
  entityType?: string;
  entityId?: number;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  // ── Queries ─────────────────────────────────────────────────────────

  public async findManyByUser(
    { userId, unreadOnly, limit }: NotificationsByUserArgs,
    { select }: NotificationSelect,
  ): Promise<Notification[]> {
    return await this.prismaService.notification.findMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        ...(unreadOnly && { readAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit && limit > 0 ? limit : 50,
      select,
    });
  }

  /** Lightweight count for the bell badge. */
  public async unreadCountByUser(userId: number): Promise<number> {
    return await this.prismaService.notification.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
    });
  }

  // ── Mutations ───────────────────────────────────────────────────────

  public async markRead(
    { notificationId, userId }: NotificationMarkReadInput,
    { select }: NotificationSelect,
  ): Promise<Notification> {
    // Scope by both notificationId AND userId so a user can't flip another
    // user's notifications even if they guess an id.
    await this.prismaService.notification.updateMany({
      where: { notificationId, userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return await this.prismaService.notification.findUniqueOrThrow({
      where: { notificationId },
      select,
    });
  }

  /** Returns the count of notifications flipped to read. */
  public async markAllRead({
    userId,
  }: NotificationsMarkAllReadInput): Promise<number> {
    const result = await this.prismaService.notification.updateMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return result.count;
  }

  /**
   * Persist + publish an in-app notification. Other services call this from
   * inside their state-transition functions.
   *
   * For v1 we mark new in-app notifications as `SENT` immediately — no queue.
   */
  public async emit(input: NotificationEmitInput): Promise<Notification> {
    const notification = await this.prismaService.notification.create({
      data: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        template: input.template,
        subject: input.subject,
        body: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });

    // Fire-and-forget over the pub/sub bus. Subscribers filter by userId.
    void this.pubSub.publish(NOTIFICATION_CREATED_EVENT, {
      notificationCreated: notification,
    });

    return notification;
  }
}
