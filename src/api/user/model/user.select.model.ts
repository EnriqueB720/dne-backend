import { SupplierSelect } from 'src/api/supplier/model';

export interface UserSelect {
  select: {
    userId?: boolean;
    email?: boolean;
    name?: boolean;
    phone?: boolean;
    language?: boolean;
    country?: boolean;
    profilePicture?: boolean;
    isCustomer?: boolean;
    isSupplier?: boolean;
    isAdmin?: boolean;
    createdAt?: boolean;
    supplier?: SupplierSelect;
    customer?: { select: { customerId?: boolean } };
  };
}
