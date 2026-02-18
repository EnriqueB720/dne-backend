import { PricingSelect } from 'src/api/pricing/model';

interface SubscriptionPrismaSelect {
  subscriptionId?: boolean;
  userId?: boolean;
  planId?: boolean;
  plan?: PricingSelect;
  startDate?: boolean;
  endDate?: boolean;
  status?: boolean;
}

export interface SubscriptionSelect {
  select?: SubscriptionPrismaSelect;
}
