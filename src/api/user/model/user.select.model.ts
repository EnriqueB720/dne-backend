import { SubscriptionSelect } from 'src/api/subscription/model';
import { SupplierSelect } from 'src/api/supplier/model';

interface UserPrismaSelect {
  userId?: boolean;
  email?: boolean;
  name?: boolean;
  phone?: boolean;
  language?: boolean;
  country?: boolean;
  role?: boolean;
  profilePicture?: boolean;
  createdAt?: boolean;
  subscription?: SubscriptionSelect;
  supplier?: SupplierSelect;
}

export interface UserSelect {
  select?: UserPrismaSelect;
}
