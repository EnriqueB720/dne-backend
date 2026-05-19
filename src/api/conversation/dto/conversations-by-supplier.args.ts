import { ArgsType, Field, Int } from '@nestjs/graphql';
import { ConversationStatus } from '@prisma/client';

@ArgsType()
export class ConversationsBySupplierArgs {
  @Field(() => Int)
  supplierId: number;

  @Field(() => Int)
  viewerUserId: number;

  @Field(() => ConversationStatus, { nullable: true })
  status?: ConversationStatus;
}
