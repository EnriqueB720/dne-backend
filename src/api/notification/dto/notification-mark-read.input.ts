import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class NotificationMarkReadInput {
  @Field(() => Int)
  notificationId: number;

  @Field(() => Int)
  userId: number;
}
