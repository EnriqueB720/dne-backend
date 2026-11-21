import { ServiceSelect } from 'src/api/service/model';
import { SupplierCategorySelect } from './supplier-category.select.model';
import { MediaAssetSelect } from './media-asset.select.model';

interface SupplierPrismaSelect {
  supplierId?: boolean;
  companyName?: boolean;
  tagline?: boolean;
  description?: boolean;
  skills?: boolean;
  businessPhone?: boolean;
  businessPhoneAlt?: boolean;
  businessEmail?: boolean;
  businessEmailAlt?: boolean;
  whatsappNumber?: boolean;
  websiteUrl?: boolean;
  province?: boolean;
  serviceProvinces?: boolean;
  city?: boolean;
  address?: boolean;
  rating?: boolean;
  reviewCount?: boolean;
  verifiedAt?: boolean;
  preferredAt?: boolean;
  preferredUntil?: boolean;
  source?: boolean;
  claimedAt?: boolean;
  createdAt?: boolean;
  services?: ServiceSelect;
  categories?: SupplierCategorySelect;
  media?: MediaAssetSelect;
}

export interface SupplierSelect {
  select?: SupplierPrismaSelect;
}
