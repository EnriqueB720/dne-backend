import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prisma, QuoteStatus } from '@prisma/client';
import { QuoteItem } from './quote-item.model';

@ObjectType()
export class Quote {
  @Field()
  quoteId: number;

  @Field()
  requestId: number;

  @Field()
  supplierId: number;

  @Field(() => String)
  totalPrice: Prisma.Decimal;

  @Field()
  currency: string;

  @Field({ nullable: true })
  message?: string;

  @Field()
  validUntil: Date;

  @Field(() => QuoteStatus)
  status: QuoteStatus;

  @Field({ nullable: true })
  viewedAt?: Date;

  @Field({ nullable: true })
  respondedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [QuoteItem], { nullable: true })
  items?: QuoteItem[];
}

registerEnumType(QuoteStatus, {
  name: 'QuoteStatus',
  description: 'Lifecycle status of a supplier quote',
});
