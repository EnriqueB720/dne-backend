import { Module } from '@nestjs/common';

import { ChatModule } from '../chat/chat.module';
import { SupplierModule } from '../supplier/supplier.module';
import { ChatTurnResolver } from './chat-turn.resolver';
import { ChatTurnService } from './chat-turn.service';

/** The AI chat turn (parse → province search → grounded reply → persist). */
@Module({
  imports: [ChatModule, SupplierModule],
  providers: [ChatTurnService, ChatTurnResolver],
})
export class AssistantModule {}
