import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class UserWhereInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field({ nullable: true })
  email?: string;
}
