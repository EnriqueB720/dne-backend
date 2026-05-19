import { MessageSelect } from './message.select.model';
import { SupplierSelect } from 'src/api/supplier/model';
import { CustomerSelect } from 'src/api/customer/model';
import { RequestSelect } from 'src/api/request/model';

interface ConversationPrismaSelect {
  conversationId?: boolean;
  requestId?: boolean;
  customerId?: boolean;
  supplierId?: boolean;
  status?: boolean;
  lastMessageAt?: boolean;
  contactShareWarnings?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  messages?: MessageSelect;
  supplier?: SupplierSelect;
  customer?: CustomerSelect;
  request?: RequestSelect;
}

export interface ConversationSelect {
  select?: ConversationPrismaSelect;
}
