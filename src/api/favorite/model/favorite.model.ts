import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Supplier } from 'src/api/supplier/model';

/**
 * A customer's "saved" supplier — used to populate the Saved tab on the
 * customer dashboard and the heart-toggle on the public storefront.
 */
@ObjectType()
export class Favorite {
  @Field(() => Int)
  favoriteId: number;

  @Field(() => Int)
  customerId: number;

  @Field(() => Int)
  supplierId: number;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field(() => Supplier, { nullable: true })
  supplier?: Supplier;
}
