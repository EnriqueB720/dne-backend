import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ConversationResolver } from './conversation.resolver';
import { ConversationService } from './conversation.service';

@Module({
  imports: [NotificationModule],
  providers: [ConversationResolver, ConversationService],
  exports: [ConversationResolver, ConversationService],
})
export class ConversationModule {}
