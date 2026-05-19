import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

@ObjectType()
export class Notification {
  @Field(() => Int)
  notificationId: number;

  @Field(() => Int)
  userId: number;

  @Field(() => NotificationChannel)
  channel: NotificationChannel;

  /**
   * Notification type — used by the frontend to render the right copy and
   * decide where to deep-link. e.g. `NEW_QUOTE`, `QUOTE_ACCEPTED`,
   * `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `NEW_REQUEST_MATCH`.
   */
  @Field()
  template: string;

  @Field({ nullable: true })
  subject?: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  entityType?: string;

  @Field(() => Int, { nullable: true })
  entityId?: number;

  @Field(() => NotificationStatus)
  status: NotificationStatus;

  @Field({ nullable: true })
  readAt?: Date;

  @Field()
  createdAt: Date;
}

registerEnumType(NotificationChannel, {
  name: 'NotificationChannel',
  description: 'How a notification is delivered (in-app, email, etc.)',
});

registerEnumType(NotificationStatus, {
  name: 'NotificationStatus',
  description: 'Delivery lifecycle status of a notification',
});
