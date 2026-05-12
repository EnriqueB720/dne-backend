import { SubscriptionSelect } from 'src/api/subscription/model';
import { SupplierSelect } from 'src/api/supplier/model';
import { CustomerSelect } from 'src/api/customer/model';

interface UserPrismaSelect {
  userId?: boolean;
  email?: boolean;
  name?: boolean;
  phone?: boolean;
  language?: boolean;
  country?: boolean;
  role?: boolean;
  profilePicture?: boolean;
  isCustomer?: boolean;
  isSupplier?: boolean;
  isAdmin?: boolean;
  createdAt?: boolean;
  subscription?: SubscriptionSelect;
  supplier?: SupplierSelect;
  customer?: CustomerSelect;
}

export interface UserSelect {
  select?: UserPrismaSelect;
}
