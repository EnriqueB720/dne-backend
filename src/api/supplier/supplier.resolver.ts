import { Resolver } from '@nestjs/graphql';
import { SupplierService } from './supplier.service';
import { Supplier } from './model';

@Resolver(() => Supplier)
export class SupplierResolver {
  constructor(private readonly supplierService: SupplierService) {}


}
