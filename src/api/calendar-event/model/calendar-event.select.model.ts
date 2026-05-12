interface CalendarEventPrismaSelect {
  calendarEventId?: boolean;
  supplierId?: boolean;
  eventType?: boolean;
  title?: boolean;
  notes?: boolean;
  startsAt?: boolean;
  endsAt?: boolean;
  allDay?: boolean;
  timezone?: boolean;
  bookingId?: boolean;
  quoteId?: boolean;
  location?: boolean;
  recurrenceRule?: boolean;
  status?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
}

export interface CalendarEventSelect {
  select?: CalendarEventPrismaSelect;
}
