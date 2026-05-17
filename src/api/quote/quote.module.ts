import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { QuoteResolver } from './quote.resolver';
import { QuoteService } from './quote.service';

@Module({
  imports: [NotificationModule],
  providers: [QuoteResolver, QuoteService],
  exports: [QuoteResolver, QuoteService],
})
export class QuoteModule {}
