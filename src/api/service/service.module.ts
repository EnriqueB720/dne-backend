import { Module } from '@nestjs/common';
import { SupplierModule } from '../supplier/supplier.module';
import { ServiceResolver } from './service.resolver';
import { ServiceService } from './service.service';

@Module({
  imports: [SupplierModule],
  providers: [ServiceResolver, ServiceService],
  exports: [ServiceResolver, ServiceService],
})
export class ServiceModule {}
