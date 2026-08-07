import { Module } from '@nestjs/common';
import { PostModule } from '../post/post.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { GoogleDriveModule } from '../../shared/google-drive/google-drive.module';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';

@Module({
  imports: [PostModule, EmbeddingModule, GoogleDriveModule],
  providers: [SupplierResolver, SupplierService],
  exports: [SupplierResolver, SupplierService],
})
export class SupplierModule {}
