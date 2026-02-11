import { ArgsType, Field } from '@nestjs/graphql';
import { SearchWhereInput } from './search.input';

@ArgsType()
export class SearchArgs {
  @Field(() => SearchWhereInput)
  search: SearchWhereInput;
}
