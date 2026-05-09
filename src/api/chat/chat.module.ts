import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import {
  AnthropicProvider,
  GeminiProvider,
  OpenAiProvider,
} from './providers';

@Module({
  controllers: [ChatController, ConversationController],
  providers: [
    ChatService,
    ConversationService,
    AnthropicProvider,
    OpenAiProvider,
    GeminiProvider,
  ],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
