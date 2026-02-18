import { ArgsType, Field } from '@nestjs/graphql';
import { PricingWhereInput } from './pricing-where.input';

@ArgsType()
export class PricingArgs {
  @Field(() => PricingWhereInput)
  where: PricingWhereInput;
}
