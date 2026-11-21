import { Module } from '@nestjs/common';

import { AiUsageLogModule } from '../ai-usage-log/ai-usage-log.module';
import { AiConversationResolver } from './ai-conversation.resolver';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { AnthropicProvider, GeminiProvider } from './providers';

/**
 * AI plumbing: ChatService (Claude → Gemini fallback, used by every AI call)
 * and persisted conversations. Chat turns are built in ../assistant.
 */
@Module({
  imports: [AiUsageLogModule],
  providers: [
    ChatService,
    ConversationService,
    AiConversationResolver,
    AnthropicProvider,
    GeminiProvider,
  ],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
