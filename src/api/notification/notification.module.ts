import { Module } from '@nestjs/common';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';

@Module({
  imports: [],
  providers: [NotificationResolver, NotificationService],
  exports: [NotificationResolver, NotificationService],
})
export class NotificationModule {}
