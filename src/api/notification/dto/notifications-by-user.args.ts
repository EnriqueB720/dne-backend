import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class NotificationsByUserArgs {
  @Field(() => Int)
  userId: number;

  @Field({ nullable: true, defaultValue: false })
  unreadOnly?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  limit?: number;
}
