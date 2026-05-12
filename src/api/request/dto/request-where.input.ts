import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class RequestWhereInput {
  @Field(() => Int, { nullable: true })
  requestId?: number;
}
