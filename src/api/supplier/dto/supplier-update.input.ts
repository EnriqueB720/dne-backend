import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';

/**
 * The signed-in supplier's own business profile. Omitted = unchanged,
 * empty string = clear it. `serviceProvinces` is a full replace and always
 * gets the home `province` added.
 */
@InputType()
export class SupplierUpdateInput {
  @IsOptional()
  @MinLength(2)
  @MaxLength(120)
  @Field({ nullable: true })
  companyName?: string;

  @IsOptional()
  @MaxLength(160)
  @Field({ nullable: true })
  tagline?: string;

  @IsOptional()
  @MaxLength(4000)
  @Field({ nullable: true })
  description?: string;

  @IsOptional()
  @MaxLength(30)
  @Field({ nullable: true })
  businessPhone?: string;

  @IsOptional()
  @MaxLength(30)
  @Field({ nullable: true })
  businessPhoneAlt?: string;

  @IsOptional()
  @IsEmail({}, { message: 'businessEmail must be an email' })
  @Field({ nullable: true })
  businessEmail?: string;

  @IsOptional()
  @IsEmail({}, { message: 'businessEmailAlt must be an email' })
  @Field({ nullable: true })
  businessEmailAlt?: string;

  @IsOptional()
  @MaxLength(30)
  @Field({ nullable: true })
  whatsappNumber?: string;

  @IsOptional()
  @IsUrl({ require_protocol: false }, { message: 'websiteUrl must be a URL' })
  @Field({ nullable: true })
  websiteUrl?: string;

  /** ISO 3166-2 code, e.g. "CR-SJ". */
  @IsOptional()
  @MaxLength(10)
  @Field({ nullable: true })
  province?: string;

  @Field(() => [String], { nullable: true })
  serviceProvinces?: string[];

  @IsOptional()
  @MaxLength(120)
  @Field({ nullable: true })
  city?: string;

  @IsOptional()
  @MaxLength(300)
  @Field({ nullable: true })
  address?: string;
}
