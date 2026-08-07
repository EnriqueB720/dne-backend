import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class ServicesBySupplierArgs {
  @Field(() => Int)
  supplierId: number;

  /**
   * Include services the supplier has toggled off. The settings page wants
   * them (so they can be re-enabled); the public profile does not.
   */
  @Field({ nullable: true })
  includeInactive?: boolean;
}
