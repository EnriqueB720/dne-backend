import { Module } from '@nestjs/common';

import { AiUsageLogModule } from '../ai-usage-log/ai-usage-log.module';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [AiUsageLogModule],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
