interface QuoteItemPrismaSelect {
  quoteItemId?: boolean;
  quoteId?: boolean;
  serviceId?: boolean;
  description?: boolean;
  quantity?: boolean;
  unitPrice?: boolean;
  total?: boolean;
}

export interface QuoteItemSelect {
  select?: QuoteItemPrismaSelect;
}
