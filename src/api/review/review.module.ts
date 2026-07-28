import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ReviewResolver } from './review.resolver';
import { ReviewService } from './review.service';

@Module({
  imports: [NotificationModule],
  providers: [ReviewResolver, ReviewService],
  exports: [ReviewResolver, ReviewService],
})
export class ReviewModule {}
