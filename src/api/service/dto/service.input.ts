import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

/** Create (no serviceId) or full-replace update (with serviceId). */
@InputType()
export class ServiceInput {
  @Field(() => Int, { nullable: true })
  serviceId?: number;

  @MinLength(2)
  @MaxLength(120)
  @Field()
  name: string;

  @IsOptional()
  @MaxLength(1000)
  @Field({ nullable: true })
  description?: string;

  /** Non-negative number as a string ("15000"). Blank = no price. */
  @IsOptional()
  @Field({ nullable: true })
  priceFrom?: string;

  @IsOptional()
  @MaxLength(30)
  @Field({ nullable: true })
  priceUnit?: string;

  @IsOptional()
  @MaxLength(3)
  @Field({ nullable: true })
  currency?: string;
}
