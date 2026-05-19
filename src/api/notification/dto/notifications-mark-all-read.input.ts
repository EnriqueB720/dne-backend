import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class NotificationsMarkAllReadInput {
  @Field(() => Int)
  userId: number;
}
