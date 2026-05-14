import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ConversationStatus } from '@prisma/client';
import { Message } from './message.model';
import { Supplier } from 'src/api/supplier/model';
import { Customer } from 'src/api/customer/model';
import { Request } from 'src/api/request/model';

@ObjectType()
export class Conversation {
  @Field()
  conversationId: number;

  @Field()
  requestId: number;

  @Field()
  customerId: number;

  @Field()
  supplierId: number;

  @Field(() => ConversationStatus)
  status: ConversationStatus;

  @Field({ nullable: true })
  lastMessageAt?: Date;

  @Field()
  contactShareWarnings: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [Message], { nullable: true })
  messages?: Message[];

  @Field(() => Supplier, { nullable: true })
  supplier?: Supplier;

  @Field(() => Customer, { nullable: true })
  customer?: Customer;

  @Field(() => Request, { nullable: true })
  request?: Request;
}

registerEnumType(ConversationStatus, {
  name: 'ConversationStatus',
  description: 'Lifecycle status of a customer↔supplier conversation',
});
