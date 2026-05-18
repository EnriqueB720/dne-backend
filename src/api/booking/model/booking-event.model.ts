import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Lightweight payload for the booking subscriptions. Subscribers use it as
 * a trigger to refetch their data — the payload deliberately does not
 * carry the full Booking shape.
 */
@ObjectType()
export class BookingEvent {
  @Field()
  eventType: string;

  @Field(() => Int)
  bookingId: number;
}
