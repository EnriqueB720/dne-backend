import { ArgsType, Field, Int } from '@nestjs/graphql';
import { RequestStatus } from '@prisma/client';

@ArgsType()
export class RequestListArgs {
  @Field(() => Int)
  customerId: number;

  @Field(() => RequestStatus, { nullable: true })
  status?: RequestStatus;
}

@ArgsType()
export class RequestsBySupplierArgs {
  @Field(() => Int)
  supplierId: number;

  @Field(() => RequestStatus, { nullable: true })
  status?: RequestStatus;
}
