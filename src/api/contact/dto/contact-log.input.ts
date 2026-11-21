import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { ContactChannel } from '@prisma/client';

registerEnumType(ContactChannel, {
  name: 'ContactChannel',
  description: 'How a customer reached out to a supplier',
});

/**
 * One customer → supplier contact. The customer comes from the token when
 * signed in; guests pass their chat `deviceId` so repeat clicks dedupe.
 */
@InputType()
export class ContactLogInput {
  @Field(() => Int)
  supplierId: number;

  @Field(() => ContactChannel)
  channel: ContactChannel;

  /** Where the click happened: 'chat' or 'profile'. */
  @Field({ nullable: true })
  source?: string;

  @Field({ nullable: true })
  deviceId?: string;
}
