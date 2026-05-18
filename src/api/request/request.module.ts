import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { RequestResolver } from './request.resolver';
import { RequestService } from './request.service';

@Module({
  imports: [NotificationModule],
  providers: [RequestResolver, RequestService],
  exports: [RequestResolver, RequestService],
})
export class RequestModule {}
