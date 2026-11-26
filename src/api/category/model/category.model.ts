import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Category {
  @Field(() => Int)
  categoryId: number;

  /** Stable key ("plumbing", "building-materials"). */
  @Field()
  slug: string;

  @Field()
  nameEs: string;

  @Field()
  nameEn: string;

  /** Single emoji. */
  @Field({ nullable: true })
  icon?: string;
}
