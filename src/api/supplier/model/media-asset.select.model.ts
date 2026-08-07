interface MediaAssetPrismaSelect {
  mediaAssetId?: boolean;
  url?: boolean;
  thumbnailUrl?: boolean;
  altText?: boolean;
  caption?: boolean;
  displayOrder?: boolean;
  mimeType?: boolean;
}

export interface MediaAssetSelect {
  select?: MediaAssetPrismaSelect;
}
