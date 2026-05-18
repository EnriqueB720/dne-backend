interface NotificationPrismaSelect {
  notificationId?: boolean;
  userId?: boolean;
  channel?: boolean;
  template?: boolean;
  subject?: boolean;
  body?: boolean;
  entityType?: boolean;
  entityId?: boolean;
  status?: boolean;
  readAt?: boolean;
  createdAt?: boolean;
}

export interface NotificationSelect {
  select?: NotificationPrismaSelect;
}
