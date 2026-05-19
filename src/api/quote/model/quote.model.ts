import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prisma, QuoteStatus } from '@prisma/client';
import { QuoteItem } from './quote-item.model';
import { QuoteSlot } from './quote-slot.model';
import { Supplier } from 'src/api/supplier/model';
import { Request } from 'src/api/request/model';

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

  // TS type is `any` (Prisma returns this column as `JsonValue`), but the
  // GraphQL schema is strongly typed as `[QuoteSlot]` and the stored shape
  // is always `[{ startsAt, endsAt }, …]`. Default field-resolver passes the
  // raw JSON through and GraphQL serializes each entry.
  @Field(() => [QuoteSlot], { nullable: true })
  offeredSlots?: any;

  @Field(() => Int, { nullable: true })
  selectedSlotIndex?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [QuoteItem], { nullable: true })
  items?: QuoteItem[];

  @Field(() => Supplier, { nullable: true })
  supplier?: Supplier;

  @Field(() => Request, { nullable: true })
  request?: Request;
}

registerEnumType(QuoteStatus, {
  name: 'QuoteStatus',
  description: 'Lifecycle status of a supplier quote',
});
