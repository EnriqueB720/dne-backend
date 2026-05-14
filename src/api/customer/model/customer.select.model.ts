import { UserSelect } from 'src/api/user/model';

interface CustomerPrismaSelect {
  customerId?: boolean;
  userId?: boolean;
  defaultCity?: boolean;
  marketingOptIn?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  user?: UserSelect;
}

export interface CustomerSelect {
  select?: CustomerPrismaSelect;
}
