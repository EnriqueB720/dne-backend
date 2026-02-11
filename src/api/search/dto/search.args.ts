import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class SearchArgs {
  @Field({ nullable: true })
  query?: string;

  @Field()
  skip: number;


  @Field()
  take: number;
}
