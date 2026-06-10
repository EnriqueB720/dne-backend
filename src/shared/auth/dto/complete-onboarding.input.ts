import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsOptional } from 'class-validator';

/**
 * Finishes a social signup. A user created through OAuth starts with no
 * customer/supplier profile; this picks the role and supplies the data the
 * provider couldn't (company name for suppliers, phone number).
 */
@InputType()
export class CompleteOnboardingInput {
  @IsIn(['CUSTOMER', 'SUPPLIER'])
  @Field()
  role: string;

  /** Required only when role === 'SUPPLIER'. */
  @IsOptional()
  @Field({ nullable: true })
  companyName?: string;

  @IsOptional()
  @Field({ nullable: true })
  phone?: string;

  @IsOptional()
  @Field({ nullable: true })
  country?: string;
}
