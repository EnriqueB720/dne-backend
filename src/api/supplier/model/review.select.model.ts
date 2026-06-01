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
}

export interface ReviewSelect {
  select?: ReviewPrismaSelect;
}
