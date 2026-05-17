import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Lightweight payload for the request subscriptions. Subscribers use it as
 * a trigger to refetch their data — the payload deliberately does not
 * carry the full Request shape.
 */
@ObjectType()
export class RequestEvent {
  @Field()
  eventType: string;

  @Field(() => Int)
  requestId: number;
}
