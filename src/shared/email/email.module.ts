import { Global, Module } from '@nestjs/common';

import { EmailService } from './email.service';

/**
 * Global so any module (auth, booking notifications, etc.) can inject
 * EmailService without re-importing.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
