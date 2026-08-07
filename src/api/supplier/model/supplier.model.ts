import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prisma, PromotionTier } from '@prisma/client';
import { Post } from 'src/api/post/model';
import { User } from 'src/api/user/model';
import { Service } from 'src/api/service/model';
import { Category } from 'src/api/category/model';
import { Review } from './review.model';
import { SupplierCategory } from './supplier-category.model';
import { MediaAsset } from './media-asset.model';

registerEnumType(PromotionTier, {
  name: 'PromotionTier',
  description: 'Sponsored-placement tier on a supplier',
});

@ObjectType()
export class Supplier {
  @Field()
  supplierId: number;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  tagline?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  businessPhone?: string;

  @Field({ nullable: true })
  businessEmail?: string;

  /** Optional second phone / email — a supplier may publish up to two of each. */
  @Field({ nullable: true })
  businessPhoneAlt?: string;

  @Field({ nullable: true })
  businessEmailAlt?: string;

  @Field({ nullable: true })
  whatsappNumber?: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  @Field({ nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  rating?: Prisma.Decimal;

  @Field({ nullable: true })
  reviewCount?: number;

  @Field({ nullable: true })
  responseTimeMinutes?: number;

  @Field({ nullable: true })
  minCapacity?: number;

  @Field({ nullable: true })
  maxCapacity?: number;

  @Field({ nullable: true })
  verified?: boolean;

  @Field({ nullable: true })
  premium?: boolean;

  @Field(() => PromotionTier)
  promotionTier: PromotionTier;

  @Field({ nullable: true })
  promotionStartDate?: Date;

  @Field({ nullable: true })
  promotionEndDate?: Date;

  @Field(() => [Service], { nullable: true })
  services?: Service[];

  @Field(() => [Post], { nullable: true })
  posts?: Post[];

  @Field(() => [SupplierCategory], { nullable: true })
  categories?: SupplierCategory[];

  @Field(() => [Review], { nullable: true })
  reviewsReceived?: Review[];

  /** Storefront gallery photos, ascending by `displayOrder`. */
  @Field(() => [MediaAsset], { nullable: true })
  media?: MediaAsset[];
}
