import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class SearchArgs {
  @Field({ nullable: true })
  query?: string;

  @Field({ nullable: true })
  skip?: number;


  @Field({ nullable: true })
  take?: number;
}
