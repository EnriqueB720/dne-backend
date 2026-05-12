import { PostSelect } from 'src/api/post/model';
import { UserSelect } from 'src/api/user/model';
import { ServiceSelect } from 'src/api/service/model';

interface SupplierPrismaSelect {
  supplierId?: boolean;
  user?: UserSelect;
  companyName?: boolean;
  slug?: boolean;
  tagline?: boolean;
  description?: boolean;
  businessPhone?: boolean;
  businessEmail?: boolean;
  whatsappNumber?: boolean;
  websiteUrl?: boolean;
  city?: boolean;
  rating?: boolean;
  reviewCount?: boolean;
  responseTimeMinutes?: boolean;
  minCapacity?: boolean;
  maxCapacity?: boolean;
  verified?: boolean;
  premium?: boolean;
  services?: ServiceSelect;
  posts?: PostSelect;
}

export interface SupplierSelect {
  select?: SupplierPrismaSelect;
}
