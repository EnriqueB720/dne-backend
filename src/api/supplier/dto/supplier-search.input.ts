import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

/**
 * What the chat knows about a request. The zone is worked out server-side
 * (see GeoService.resolve): `province` → `location` text → `lat/lng`.
 * When a province resolves, ONLY suppliers serving it are returned.
 */
@InputType()
export class SupplierSearchInput {
  /** What's needed, in the user's words: "fontanero", "pan dulce", "DJ". */
  @IsOptional()
  @MaxLength(200)
  @Field({ nullable: true })
  query?: string;

  /** A place the user named: "Heredia", "Escazú", "cerca de Santo Domingo". */
  @IsOptional()
  @MaxLength(120)
  @Field({ nullable: true })
  location?: string;

  /** A province the user picked explicitly (ISO 3166-2, e.g. "CR-H"). */
  @IsOptional()
  @MaxLength(10)
  @Field({ nullable: true })
  province?: string;

  /** Device coordinates — used only when no place was named or picked. */
  @Field(() => Float, { nullable: true })
  lat?: number;

  @Field(() => Float, { nullable: true })
  lng?: number;

  /** Optional category slug for tighter matching. */
  @IsOptional()
  @MaxLength(60)
  @Field({ nullable: true })
  categorySlug?: string;

  /** Max results. Default 6, max 20. */
  @Field(() => Int, { nullable: true })
  limit?: number;
}
