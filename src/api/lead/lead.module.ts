import { Module } from '@nestjs/common';
import { LeadResolver } from './lead.resolver';
import { LeadService } from './lead.service';

@Module({
  providers: [LeadResolver, LeadService],
  exports: [LeadService],
})
export class LeadModule {}
