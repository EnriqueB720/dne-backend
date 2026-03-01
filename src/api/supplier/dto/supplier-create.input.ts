import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SupplierCreateInput {
  @Field()
  companyName: string;

  @Field({ nullable: true })
  userId: number;
}
