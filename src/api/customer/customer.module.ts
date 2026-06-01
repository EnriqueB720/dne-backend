import { Module } from '@nestjs/common';
import { CustomerResolver } from './customer.resolver';
import { CustomerService } from './customer.service';

@Module({
  imports: [],
  providers: [CustomerResolver, CustomerService],
  exports: [CustomerResolver, CustomerService],
})
export class CustomerModule {}
