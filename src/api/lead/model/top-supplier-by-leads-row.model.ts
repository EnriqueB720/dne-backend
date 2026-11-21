import { Field, Int, ObjectType } from '@nestjs/graphql';

/** One row of the "top suppliers by leads" leaderboard on the admin dashboard. */
@ObjectType()
export class TopSupplierByLeadsRow {
  @Field(() => Int)
  supplierId: number;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  city?: string;

  @Field(() => Int)
  leadCount: number;
}
