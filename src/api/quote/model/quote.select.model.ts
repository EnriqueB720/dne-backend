import { QuoteItemSelect } from './quote-item.select.model';

interface QuotePrismaSelect {
  quoteId?: boolean;
  requestId?: boolean;
  supplierId?: boolean;
  totalPrice?: boolean;
  currency?: boolean;
  message?: boolean;
  validUntil?: boolean;
  status?: boolean;
  viewedAt?: boolean;
  respondedAt?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  items?: QuoteItemSelect;
}

export interface QuoteSelect {
  select?: QuotePrismaSelect;
}
