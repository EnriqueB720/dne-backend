interface CustomerPrismaSelect {
  customerId?: boolean;
  userId?: boolean;
  defaultCity?: boolean;
  marketingOptIn?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
}

export interface CustomerSelect {
  select?: CustomerPrismaSelect;
}
