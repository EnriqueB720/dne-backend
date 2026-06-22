import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class FavoritesByCustomerArgs {
  @Field(() => Int)
  customerId: number;
}
