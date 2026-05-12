import { Module } from '@nestjs/common';
import { CalendarEventResolver } from './calendar-event.resolver';
import { CalendarEventService } from './calendar-event.service';

@Module({
  imports: [],
  providers: [CalendarEventResolver, CalendarEventService],
  exports: [CalendarEventResolver, CalendarEventService],
})
export class CalendarEventModule {}
