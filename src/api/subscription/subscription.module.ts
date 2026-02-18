import { Module } from '@nestjs/common';
import { SubscriptionResolver } from './subscription.resolver';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [],
  providers: [SubscriptionResolver, SubscriptionService],
  exports: [SubscriptionResolver, SubscriptionService],
})
export class SubscriptionModule {}
