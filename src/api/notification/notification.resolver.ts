import { Inject } from '@nestjs/common';
import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

import { GraphQLFields, IGraphQLFields } from '@decorators';
import { PUB_SUB } from 'src/shared/pubsub/pubsub.module';
import {
  NOTIFICATION_CREATED_EVENT,
  NotificationService,
} from './notification.service';
import {
  NotificationMarkReadInput,
  NotificationsByUserArgs,
  NotificationsMarkAllReadInput,
} from './dto';
import { Notification, NotificationSelect } from './model';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  // ── Queries ─────────────────────────────────────────────────────────

  @Query(() => [Notification])
  public async notificationsByUser(
    @Args() args: NotificationsByUserArgs,
    @GraphQLFields() { fields }: IGraphQLFields<NotificationSelect>,
  ): Promise<Notification[]> {
    return await this.notificationService.findManyByUser(args, fields);
  }

  @Query(() => Int)
  public async unreadNotificationCount(
    @Args('userId', { type: () => Int }) userId: number,
  ): Promise<number> {
    return await this.notificationService.unreadCountByUser(userId);
  }

  // ── Mutations ───────────────────────────────────────────────────────

  @Mutation(() => Notification)
  public async markNotificationAsRead(
    @Args('data') data: NotificationMarkReadInput,
    @GraphQLFields() { fields }: IGraphQLFields<NotificationSelect>,
  ): Promise<Notification> {
    return await this.notificationService.markRead(data, fields);
  }

  /** Returns the count of notifications flipped to read. */
  @Mutation(() => Int)
  public async markAllNotificationsAsRead(
    @Args('data') data: NotificationsMarkAllReadInput,
  ): Promise<number> {
    return await this.notificationService.markAllRead(data);
  }

  // ── Subscriptions ───────────────────────────────────────────────────

  /**
   * Subscribe to new notifications for a specific user. The server-side
   * filter drops events whose userId doesn't match the subscriber, so a
   * client only receives its own notifications.
   */
  @Subscription(() => Notification, {
    name: NOTIFICATION_CREATED_EVENT,
    filter: (payload, variables) =>
      payload.notificationCreated.userId === variables.userId,
  })
  public notificationCreated(
    @Args('userId', { type: () => Int }) _userId: number,
  ) {
    // Underscore — the value is read off `variables.userId` inside the filter
    // above; this argument exists purely so codegen knows to include it.
    return this.pubSub.asyncIterableIterator(NOTIFICATION_CREATED_EVENT);
  }
}
