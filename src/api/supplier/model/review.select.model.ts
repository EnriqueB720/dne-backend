import { CustomerSelect } from 'src/api/customer/model';

interface ReviewPrismaSelect {
  reviewId?: boolean;
  bookingId?: boolean;
  customerId?: boolean;
  supplierId?: boolean;
  rating?: boolean;
  text?: boolean;
  ratingQuality?: boolean;
  ratingCommunication?: boolean;
  ratingValue?: boolean;
  ratingPunctuality?: boolean;
  supplierResponse?: boolean;
  createdAt?: boolean;
  customer?: CustomerSelect;
}

export interface ReviewSelect {
  select?: ReviewPrismaSelect;
}
