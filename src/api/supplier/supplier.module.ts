import { Module } from '@nestjs/common';
import { PostModule } from '../post/post.module';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';

@Module({
  imports: [PostModule],
  providers: [SupplierResolver, SupplierService],
  exports: [SupplierResolver, SupplierService],
})
export class SupplierModule {}
