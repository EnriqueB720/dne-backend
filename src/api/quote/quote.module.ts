import { Module } from '@nestjs/common';
import { QuoteResolver } from './quote.resolver';
import { QuoteService } from './quote.service';

@Module({
  imports: [],
  providers: [QuoteResolver, QuoteService],
  exports: [QuoteResolver, QuoteService],
})
export class QuoteModule {}
