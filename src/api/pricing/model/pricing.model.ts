import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';

@ObjectType()
export class Pricing {
  @Field(() => Number)
  planId?: number;

  @Field()
  planName?: string;

  @Field(() => String)
  price?: Prisma.Decimal;

  @Field()
  features?: string;
}
