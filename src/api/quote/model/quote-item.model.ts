import { Field, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';

@ObjectType()
export class QuoteItem {
  @Field()
  quoteItemId: number;

  @Field()
  quoteId: number;

  @Field({ nullable: true })
  serviceId?: number;

  @Field()
  description: string;

  @Field(() => String)
  quantity: Prisma.Decimal;

  @Field(() => String)
  unitPrice: Prisma.Decimal;

  @Field(() => String)
  total: Prisma.Decimal;
}
