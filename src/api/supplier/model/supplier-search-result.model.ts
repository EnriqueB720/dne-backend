import { Field, ObjectType } from '@nestjs/graphql';

import { ResolvedProvince } from '../../../shared/geo/geo.model';
import { Supplier } from './supplier.model';

@ObjectType({ description: 'Chat search: who serves the requested zone' })
export class SupplierSearchResult {
  /** The province searched, or null when none could be worked out (nationwide). */
  @Field(() => ResolvedProvince, { nullable: true })
  province?: ResolvedProvince | null;

  @Field(() => [Supplier])
  suppliers: Supplier[];
}
