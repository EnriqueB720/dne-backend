import { ArgsType, Field } from '@nestjs/graphql';
import { SupplierWhereInput } from './supplier-where.input';
@ArgsType()
export class SupplierArgs {
  @Field(() => SupplierWhereInput)
  where: SupplierWhereInput;
}
