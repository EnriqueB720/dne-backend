import { CategorySelect } from 'src/api/category/model';
import { QuoteSelect } from 'src/api/quote/model';
import { CustomerSelect } from 'src/api/customer/model';

interface RequestPrismaSelect {
  requestId?: boolean;
  customerId?: boolean;
  categoryId?: boolean;
  category?: CategorySelect;
  rawQuery?: boolean;
  conversationTurns?: boolean;
  isComplete?: boolean;
  city?: boolean;
  serviceDate?: boolean;
  guestCount?: boolean;
  budgetMin?: boolean;
  budgetMax?: boolean;
  status?: boolean;
  expiresAt?: boolean;
  closedAt?: boolean;
  closedReason?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  quotes?: QuoteSelect;
  customer?: CustomerSelect;
}

export interface RequestSelect {
  select?: RequestPrismaSelect;
}
