import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class QuoteSlotInput {
  @Field()
  startsAt: Date;

  @Field()
  endsAt: Date;
}
