import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { AiConversationResolver } from './ai-conversation.resolver';
import {
  AnthropicProvider,
  GeminiProvider,
  OpenAiProvider,
} from './providers';

// NOTE: JwtStrategy is registered globally by AuthModule (which AppModule
// imports). The strategy auto-registers with passport on instantiation, so
// AuthGuard('jwt') here finds it via passport's static registry — no need
// to re-provide it in this module.
@Module({
  controllers: [ChatController, ConversationController],
  providers: [
    ChatService,
    ConversationService,
    AiConversationResolver,
    AnthropicProvider,
    OpenAiProvider,
    GeminiProvider,
  ],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
