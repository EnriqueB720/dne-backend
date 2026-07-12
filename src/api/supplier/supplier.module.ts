import { Module } from '@nestjs/common';
import { PostModule } from '../post/post.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';

@Module({
  imports: [PostModule, EmbeddingModule],
  providers: [SupplierResolver, SupplierService],
  exports: [SupplierResolver, SupplierService],
})
export class SupplierModule {}
