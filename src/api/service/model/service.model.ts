import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PricingModel, Prisma } from '@prisma/client';

@ObjectType()
export class Service {
  @Field()
  serviceId: number;

  @Field()
  supplierId: number;

  @Field()
  categoryId: number;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => PricingModel)
  pricingModel: PricingModel;

  @Field(() => String)
  basePrice: Prisma.Decimal;

  @Field()
  currency: string;

  @Field(() => String, { nullable: true })
  minTotalPrice?: Prisma.Decimal;

  @Field(() => String, { nullable: true })
  maxTotalPrice?: Prisma.Decimal;

  @Field({ nullable: true })
  minUnits?: number;

  @Field({ nullable: true })
  maxUnits?: number;

  @Field({ nullable: true })
  unitLabel?: string;

  @Field()
  active: boolean;
}

registerEnumType(PricingModel, {
  name: 'PricingModel',
  description: 'How a service is priced',
});
