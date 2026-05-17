import { QuoteItemSelect } from './quote-item.select.model';
import { SupplierSelect } from 'src/api/supplier/model';
import { RequestSelect } from 'src/api/request/model';

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
  offeredSlots?: boolean;
  selectedSlotIndex?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  items?: QuoteItemSelect;
  supplier?: SupplierSelect;
  request?: RequestSelect;
}

export interface QuoteSelect {
  select?: QuotePrismaSelect;
}
