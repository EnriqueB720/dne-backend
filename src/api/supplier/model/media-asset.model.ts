import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * A photo on a supplier's storefront gallery. Uploaded through the REST
 * `/files/upload` endpoint (which pushes the bytes to Google Drive) and
 * read back over GraphQL.
 */
@ObjectType()
export class MediaAsset {
  @Field(() => Int)
  mediaAssetId: number;

  @Field()
  url: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field({ nullable: true })
  altText?: string;

  @Field({ nullable: true })
  caption?: string;

  /** Ascending — index 0 is the large hero tile on the profile. */
  @Field(() => Int)
  displayOrder: number;

  @Field({ nullable: true })
  mimeType?: string;
}
