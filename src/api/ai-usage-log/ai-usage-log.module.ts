import { Module } from '@nestjs/common';
import { AiUsageLogService } from './ai-usage-log.service';

/**
 * Lightweight module exposing a single service that writes one row per AI
 * completion. Imported by ChatModule (and anything else that calls a model)
 * so usage data lands in the DB for the admin dashboard.
 */
@Module({
  providers: [AiUsageLogService],
  exports: [AiUsageLogService],
})
export class AiUsageLogModule {}
