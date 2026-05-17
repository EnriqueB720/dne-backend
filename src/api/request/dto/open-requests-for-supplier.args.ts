import { ArgsType, Field, Int } from '@nestjs/graphql';

/**
 * "Open leads" for a supplier — requests that look like a match (same city,
 * shared category) and the supplier hasn't quoted on yet.
 */
@ArgsType()
export class OpenRequestsForSupplierArgs {
  @Field(() => Int)
  supplierId: number;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  limit?: number;
}
