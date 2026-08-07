import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * Replaces a supplier's whole category set in one call — the settings page
 * always submits the complete selection, so anything omitted is removed.
 */
@InputType()
export class SupplierCategoriesInput {
  @Field(() => Int)
  supplierId: number;

  @Field(() => [Int])
  categoryIds: number[];

  /**
   * Which one leads. Ignored when it isn't part of `categoryIds`; the
   * first entry is used instead so a supplier always has exactly one.
   */
  @Field(() => Int, { nullable: true })
  primaryCategoryId?: number;
}
