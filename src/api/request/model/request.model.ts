import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prisma, RequestStatus } from '@prisma/client';
import { Category } from 'src/api/category/model';
import { Quote } from 'src/api/quote/model';

@ObjectType()
export class Request {
  @Field()
  requestId: number;

  @Field()
  customerId: number;

  @Field({ nullable: true })
  categoryId?: number;

  @Field(() => Category, { nullable: true })
  category?: Category;

  @Field()
  rawQuery: string;

  @Field()
  conversationTurns: number;

  @Field()
  isComplete: boolean;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  serviceDate?: Date;

  @Field({ nullable: true })
  guestCount?: number;

  @Field(() => String, { nullable: true })
  budgetMin?: Prisma.Decimal;

  @Field(() => String, { nullable: true })
  budgetMax?: Prisma.Decimal;

  @Field(() => RequestStatus)
  status: RequestStatus;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  closedAt?: Date;

  @Field({ nullable: true })
  closedReason?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [Quote], { nullable: true })
  quotes?: Quote[];
}

registerEnumType(RequestStatus, {
  name: 'RequestStatus',
  description: 'Lifecycle status of a customer service request',
});
