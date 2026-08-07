import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SupplierMediaDeleteInput {
  @Field(() => Int)
  mediaAssetId: number;

  /** Must own the asset — enforced by the service layer. */
  @Field(() => Int)
  supplierId: number;
}
