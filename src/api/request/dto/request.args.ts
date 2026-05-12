import { ArgsType, Field } from '@nestjs/graphql';
import { RequestWhereInput } from './request-where.input';

@ArgsType()
export class RequestArgs {
  @Field(() => RequestWhereInput)
  where: RequestWhereInput;
}
