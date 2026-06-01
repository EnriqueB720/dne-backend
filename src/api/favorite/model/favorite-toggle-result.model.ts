import { Field, Int, ObjectType } from '@nestjs/graphql';

/** Result of {@link FavoriteService.toggle} — exposed so the frontend can
 *  show the right toast ("Saved" / "Removed") without an extra query. */
@ObjectType()
export class FavoriteToggleResult {
  /** Present when the favorite was created, null after a removal. */
  @Field(() => Int, { nullable: true })
  favoriteId?: number;

  @Field(() => Int)
  customerId: number;

  @Field(() => Int)
  supplierId: number;

  @Field()
  wasAdded: boolean;
}
