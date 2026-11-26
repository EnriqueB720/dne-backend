import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';

/** A service or product on a supplier's profile, with an optional "from" price. */
@ObjectType()
export class Service {
  @Field(() => Int)
  serviceId: number;

  @Field(() => Int)
  supplierId: number;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  /** Decimal as string. Null = "ask for a price". */
  @Field(() => String, { nullable: true })
  priceFrom?: Prisma.Decimal;

  /** Shown after the price: "hora", "m²", "unidad". Null = flat price. */
  @Field({ nullable: true })
  priceUnit?: string;

  @Field()
  currency: string;
}
