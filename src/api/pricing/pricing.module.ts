import { Module } from '@nestjs/common';
import { PricingResolver } from './pricing.resolver';
import { PricingService } from './pricing.service';

@Module({
  imports: [],
  providers: [PricingResolver, PricingService],
  exports: [PricingResolver, PricingService],
})
export class PricingModule {}
