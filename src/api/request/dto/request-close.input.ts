import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class RequestCloseInput {
  @Field(() => Int)
  requestId: number;

  @Field({ nullable: true })
  reason?: string;
}
