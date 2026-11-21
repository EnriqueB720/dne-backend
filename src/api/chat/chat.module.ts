import { Module } from '@nestjs/common';

import { AiUsageLogModule } from '../ai-usage-log/ai-usage-log.module';
import { AiConversationResolver } from './ai-conversation.resolver';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { AnthropicProvider, GeminiProvider } from './providers';

/**
 * AI chat: ChatService (Claude → Gemini fallback), stateless completions
 * (ChatResolver.aiComplete, used by the frontend's intent parser) and
 * persisted conversations (AiConversationResolver).
 */
@Module({
  imports: [AiUsageLogModule],
  providers: [
    ChatService,
    ChatResolver,
    ConversationService,
    AiConversationResolver,
    AnthropicProvider,
    GeminiProvider,
  ],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
