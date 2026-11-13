import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embedding/embedding.module';
import { ChatModule } from '../chat/chat.module';
import { GoogleDriveModule } from '../../shared/google-drive/google-drive.module';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';

@Module({
  imports: [EmbeddingModule, GoogleDriveModule, ChatModule],
  providers: [SupplierResolver, SupplierService],
  exports: [SupplierResolver, SupplierService],
})
export class SupplierModule {}
