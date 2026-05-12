import { ArgsType, Field } from '@nestjs/graphql';
import { QuoteWhereInput } from './quote-where.input';

@ArgsType()
export class QuoteArgs {
  @Field(() => QuoteWhereInput)
  where: QuoteWhereInput;
}
