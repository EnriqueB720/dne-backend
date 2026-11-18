import { Field, Int, ObjectType } from '@nestjs/graphql';

/** A supplier the signed-in customer contacted and hasn't reviewed yet. */
@ObjectType()
export class ReviewPrompt {
  @Field(() => Int)
  supplierId: number;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  city?: string;

  /** Most recent contact with this supplier. */
  @Field()
  contactedAt: Date;
}
