import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * A gallery photo. Uploaded through REST `POST /files/upload` (bytes go to
 * Google Drive) and served back through `GET /files/media/:mediaAssetId`.
 */
@ObjectType()
export class MediaAsset {
  @Field(() => Int)
  mediaAssetId: number;

  @Field()
  url: string;

  @Field({ nullable: true })
  altText?: string;

  /** Ascending — index 0 is the cover photo on the profile. */
  @Field(() => Int)
  displayOrder: number;

  @Field({ nullable: true })
  mimeType?: string;
}
