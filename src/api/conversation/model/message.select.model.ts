interface MessagePrismaSelect {
  messageId?: boolean;
  conversationId?: boolean;
  senderType?: boolean;
  senderUserId?: boolean;
  content?: boolean;
  messageType?: boolean;
  filtered?: boolean;
  filteredReason?: boolean;
  readAt?: boolean;
  createdAt?: boolean;
}

export interface MessageSelect {
  select?: MessagePrismaSelect;
}
