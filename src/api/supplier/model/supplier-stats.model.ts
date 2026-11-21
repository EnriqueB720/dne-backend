import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ContactChannelCount {
  @Field()
  channel: string;

  @Field(() => Int)
  count: number;
}

/** What the supplier sees on their own page: how many people reached out. */
@ObjectType()
export class SupplierStats {
  @Field(() => Int)
  contactsLast30Days: number;

  @Field(() => Int)
  contactsTotal: number;

  @Field(() => [ContactChannelCount])
  contactsByChannel: ContactChannelCount[];

  @Field(() => Int)
  reviewCount: number;

  @Field(() => String, { nullable: true })
  rating?: string | null;
}
