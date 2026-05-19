import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { BookingResolver } from './booking.resolver';
import { BookingService } from './booking.service';

@Module({
  imports: [NotificationModule],
  providers: [BookingResolver, BookingService],
  exports: [BookingResolver, BookingService],
})
export class BookingModule {}
