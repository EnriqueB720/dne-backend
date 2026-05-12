import { Module } from '@nestjs/common';
import { BookingResolver } from './booking.resolver';
import { BookingService } from './booking.service';

@Module({
  imports: [],
  providers: [BookingResolver, BookingService],
  exports: [BookingResolver, BookingService],
})
export class BookingModule {}
