import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { AiConversationResolver } from './ai-conversation.resolver';
import {
  AnthropicProvider,
  GeminiProvider,
  OpenAiProvider,
} from './providers';
import { AiUsageLogModule } from '../ai-usage-log/ai-usage-log.module';

// NOTE: JwtStrategy is registered globally by AuthModule (which AppModule
// imports). The strategy auto-registers with passport on instantiation, so
// AuthGuard('jwt') here finds it via passport's static registry — no need
// to re-provide it in this module.
//
// ChatController is the legacy REST surface (`POST /chat`) kept for
// back-compat; ChatResolver is the GraphQL replacement (`aiComplete`).
@Module({
  imports: [AiUsageLogModule],
  controllers: [ChatController, ConversationController],
  providers: [
    ChatService,
    ChatResolver,
    ConversationService,
    AiConversationResolver,
    AnthropicProvider,
    OpenAiProvider,
    GeminiProvider,
  ],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
