interface PricingPrismaSelect {
  planId?: boolean;
  planName?: boolean;
  price?: boolean;
  features?: boolean;
}

export interface PricingSelect {
  select?: PricingPrismaSelect;
}
