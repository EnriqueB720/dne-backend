import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma, SupplierSource } from '@prisma/client';
import { registerEnumType } from '@nestjs/graphql';

import { Service } from 'src/api/service/model';
import { SupplierCategory } from './supplier-category.model';

registerEnumType(SupplierSource, {
  name: 'SupplierSource',
  description: 'How the supplier row was created',
});

/**
 * Public supplier profile. Everything here is safe to show anyone — the
 * owning user (email, phone) is deliberately NOT exposed; only the
 * business contact fields the supplier chose to publish are.
 */
@ObjectType()
export class Supplier {
  @Field(() => Int)
  supplierId: number;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  tagline?: string;

  @Field({ nullable: true })
  description?: string;

  /** Lowercase capabilities that sharpen AI matching ("fugas", "wedding dj"). */
  @Field(() => [String], { nullable: true })
  skills?: string[];

  @Field({ nullable: true })
  businessPhone?: string;

  @Field({ nullable: true })
  businessPhoneAlt?: string;

  @Field({ nullable: true })
  businessEmail?: string;

  @Field({ nullable: true })
  businessEmailAlt?: string;

  @Field({ nullable: true })
  whatsappNumber?: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  /** ISO 3166-2 code of the province the business is based in, e.g. "CR-H". */
  @Field({ nullable: true })
  province?: string;

  /** Every province served (includes `province`). */
  @Field(() => [String], { nullable: true })
  serviceProvinces?: string[];

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  address?: string;

  /** Average stars of visible reviews (string to keep decimal precision). */
  @Field(() => String, { nullable: true })
  rating?: Prisma.Decimal;

  @Field(() => Int, { nullable: true })
  reviewCount?: number;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field({ nullable: true })
  preferredAt?: Date;

  @Field({ nullable: true })
  preferredUntil?: Date;

  @Field(() => SupplierSource, { nullable: true })
  source?: SupplierSource;

  @Field({ nullable: true })
  claimedAt?: Date;

  @Field({ nullable: true })
  createdAt?: Date;

  @Field(() => [Service], { nullable: true })
  services?: Service[];

  @Field(() => [SupplierCategory], { nullable: true })
  categories?: SupplierCategory[];

  // Computed (see SupplierResolver @ResolveField + COMPUTED_FIELDS):
  // verified, preferred, provinceName, serviceProvinceNames.
  verified?: boolean;
  preferred?: boolean;
  provinceName?: string;
  serviceProvinceNames?: string[];
}
