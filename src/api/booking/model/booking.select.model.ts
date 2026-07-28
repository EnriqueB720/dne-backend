import { ReviewSelect, SupplierSelect } from 'src/api/supplier/model';
import { CustomerSelect } from 'src/api/customer/model';
import { RequestSelect } from 'src/api/request/model';
import { QuoteSelect } from 'src/api/quote/model';

interface BookingPrismaSelect {
  bookingId?: boolean;
  requestId?: boolean;
  quoteId?: boolean;
  customerId?: boolean;
  supplierId?: boolean;
  serviceDate?: boolean;
  serviceEndDate?: boolean;
  location?: boolean;
  guestCount?: boolean;
  totalPrice?: boolean;
  platformFee?: boolean;
  supplierPayout?: boolean;
  currency?: boolean;
  status?: boolean;
  paymentStatus?: boolean;
  phoneRevealedAt?: boolean;
  cancellationReason?: boolean;
  cancelledAt?: boolean;
  cancelledBy?: boolean;
  completedAt?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  supplier?: SupplierSelect;
  customer?: CustomerSelect;
  request?: RequestSelect;
  quote?: QuoteSelect;
  review?: ReviewSelect;
}

export interface BookingSelect {
  select?: BookingPrismaSelect;
}
