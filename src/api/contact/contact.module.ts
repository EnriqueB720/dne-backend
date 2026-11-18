import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ContactNudgeService } from './contact-nudge.service';
import { ContactResolver } from './contact.resolver';
import { ContactService } from './contact.service';

@Module({
  imports: [NotificationModule],
  providers: [ContactResolver, ContactService, ContactNudgeService],
  exports: [ContactService],
})
export class ContactModule {}
