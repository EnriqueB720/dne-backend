import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { Review, Supplier } from 'src/api/supplier/model';
import { Customer } from 'src/api/customer/model';
import { Request } from 'src/api/request/model';
import { Quote } from 'src/api/quote/model';

@ObjectType()
export class Booking {
  @Field()
  bookingId: number;

  @Field()
  requestId: number;

  @Field()
  quoteId: number;

  @Field()
  customerId: number;

  @Field()
  supplierId: number;

  @Field()
  serviceDate: Date;

  @Field({ nullable: true })
  serviceEndDate?: Date;

  @Field()
  location: string;

  @Field({ nullable: true })
  guestCount?: number;

  @Field(() => String)
  totalPrice: Prisma.Decimal;

  @Field(() => String)
  platformFee: Prisma.Decimal;

  @Field(() => String)
  supplierPayout: Prisma.Decimal;

  @Field()
  currency: string;

  @Field(() => BookingStatus)
  status: BookingStatus;

  @Field(() => PaymentStatus)
  paymentStatus: PaymentStatus;

  @Field({ nullable: true })
  phoneRevealedAt?: Date;

  @Field({ nullable: true })
  cancellationReason?: string;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field({ nullable: true })
  cancelledBy?: string;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => Supplier, { nullable: true })
  supplier?: Supplier;

  @Field(() => Customer, { nullable: true })
  customer?: Customer;

  @Field(() => Request, { nullable: true })
  request?: Request;

  @Field(() => Quote, { nullable: true })
  quote?: Quote;

  /** Present once the customer has reviewed this (completed) booking. */
  @Field(() => Review, { nullable: true })
  review?: Review;
}

registerEnumType(BookingStatus, {
  name: 'BookingStatus',
  description: 'Lifecycle status of a booking',
});

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Payment lifecycle on a booking',
});
