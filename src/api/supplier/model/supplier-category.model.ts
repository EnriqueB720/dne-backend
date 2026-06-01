import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Category } from 'src/api/category/model';

/**
 * Junction row linking a Supplier to a Category, with an `isPrimary` flag
 * for the supplier's main category. Exposed so the storefront can render
 * category chips.
 */
@ObjectType()
export class SupplierCategory {
  @Field(() => Int)
  supplierId: number;

  @Field(() => Int)
  categoryId: number;

  @Field()
  isPrimary: boolean;

  @Field(() => Category, { nullable: true })
  category?: Category;
}
