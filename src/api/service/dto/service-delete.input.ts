import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ServiceDeleteInput {
  @Field(() => Int)
  serviceId: number;

  /** Must own the service — enforced by the service layer. */
  @Field(() => Int)
  supplierId: number;
}
