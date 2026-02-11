import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class SearchWhereInput {
  @Field({ nullable: true })
  query?: string;
}