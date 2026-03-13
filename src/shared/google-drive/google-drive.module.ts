import { Module } from '@nestjs/common';
import { GoogleDriveController } from './google-drive.controller';
import { GoogleDriveService } from './google-drive.service';

@Module({
  imports: [],
  controllers: [GoogleDriveController],
  providers: [GoogleDriveService],
})
export class GoogleDriveModule {}