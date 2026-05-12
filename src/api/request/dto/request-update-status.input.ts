import { InputType, Field, Int } from '@nestjs/graphql';
import { RequestStatus } from '@prisma/client';

@InputType()
export class RequestUpdateStatusInput {
  @Field(() => Int)
  requestId: number;

  @Field(() => RequestStatus)
  status: RequestStatus;
}
