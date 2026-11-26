export interface ServiceSelect {
  select?: {
    serviceId?: boolean;
    supplierId?: boolean;
    name?: boolean;
    description?: boolean;
    priceFrom?: boolean;
    priceUnit?: boolean;
    currency?: boolean;
  };
}
