import { ArgsType, Field } from '@nestjs/graphql';
import { CustomerWhereInput } from './customer-where.input';

@ArgsType()
export class CustomerArgs {
  @Field(() => CustomerWhereInput)
  where: CustomerWhereInput;
}
