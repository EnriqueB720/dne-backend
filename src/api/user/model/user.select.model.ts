import { SubscriptionSelect } from 'src/api/subscription/model';

interface UserPrismaSelect {
  userId?: boolean;
  email?: boolean;
  name?: boolean;
  phone?: boolean;
  language?: boolean;
  country?: boolean;
  role?: boolean;
  createdAt?: boolean;
  subscription?: SubscriptionSelect;
}

export interface UserSelect {
  select?: UserPrismaSelect;
}
