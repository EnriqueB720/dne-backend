import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

// A blank value means "clear it" (see updateMine), so only validate a filled-in one.
const isFilled = (_: object, value: unknown) => value != null && String(value).trim() !== '';

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

  @ValidateIf(isFilled)
  @IsEmail({}, { message: 'businessEmail must be an email' })
  @Field({ nullable: true })
  businessEmail?: string;

  @ValidateIf(isFilled)
  @IsEmail({}, { message: 'businessEmailAlt must be an email' })
  @Field({ nullable: true })
  businessEmailAlt?: string;

  @IsOptional()
  @MaxLength(30)
  @Field({ nullable: true })
  whatsappNumber?: string;

  @ValidateIf(isFilled)
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
