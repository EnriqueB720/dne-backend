import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SupplierMediaReorderInput {
  @Field(() => Int)
  supplierId: number;

  /**
   * Complete, ordered list of the supplier's gallery asset ids. Position in
   * the array becomes `displayOrder`, so index 0 is the hero tile.
   */
  @Field(() => [Int])
  mediaAssetIds: number[];
}
