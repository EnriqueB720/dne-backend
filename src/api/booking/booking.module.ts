import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { BookingResolver } from './booking.resolver';
import { BookingService } from './booking.service';
import { BookingNudgeService } from './booking-nudge.service';

@Module({
  imports: [NotificationModule],
  providers: [BookingResolver, BookingService, BookingNudgeService],
  exports: [BookingResolver, BookingService],
})
export class BookingModule {}
