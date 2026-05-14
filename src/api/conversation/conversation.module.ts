import { Module } from '@nestjs/common';
import { ConversationResolver } from './conversation.resolver';
import { ConversationService } from './conversation.service';

@Module({
  imports: [],
  providers: [ConversationResolver, ConversationService],
  exports: [ConversationResolver, ConversationService],
})
export class ConversationModule {}
