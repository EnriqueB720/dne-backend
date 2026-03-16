import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SupplierWhereInput {
  @Field(() => Int, { nullable: true })
  supplierId?: number;
}
