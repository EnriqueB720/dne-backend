interface ServicePrismaSelect {
  serviceId?: boolean;
  supplierId?: boolean;
  categoryId?: boolean;
  name?: boolean;
  description?: boolean;
  pricingModel?: boolean;
  basePrice?: boolean;
  currency?: boolean;
  minTotalPrice?: boolean;
  maxTotalPrice?: boolean;
  minUnits?: boolean;
  maxUnits?: boolean;
  unitLabel?: boolean;
  active?: boolean;
}

export interface ServiceSelect {
  select?: ServicePrismaSelect;
}
