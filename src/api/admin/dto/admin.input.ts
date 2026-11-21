import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

export enum AdminSupplierStatus {
  ALL = 'ALL',
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  PREFERRED = 'PREFERRED',
}

registerEnumType(AdminSupplierStatus, { name: 'AdminSupplierStatus' });

@InputType()
export class AdminSupplierFilter {
  /** Matches company name, city or owner email. */
  @IsOptional()
  @MaxLength(100)
  @Field({ nullable: true })
  search?: string;

  @Field(() => AdminSupplierStatus, { nullable: true, defaultValue: AdminSupplierStatus.ALL })
  status?: AdminSupplierStatus;

  @IsOptional()
  @MaxLength(10)
  @Field({ nullable: true })
  province?: string;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset?: number;
}

@InputType()
export class AdminPreferredInput {
  @Field(() => Int)
  supplierId: number;

  @Field()
  preferred: boolean;

  /** Optional end of the placement. Ignored when `preferred` is false. */
  @Field({ nullable: true })
  until?: Date;
}
