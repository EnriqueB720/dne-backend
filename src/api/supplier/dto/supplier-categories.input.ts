import { Field, InputType, Int } from '@nestjs/graphql';

/** Full replace of the signed-in supplier's categories (1–5). */
@InputType()
export class SupplierCategoriesInput {
  @Field(() => [Int])
  categoryIds: number[];

  /** Which one leads; falls back to the first id. */
  @Field(() => Int, { nullable: true })
  primaryCategoryId?: number;
}
