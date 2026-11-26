import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '@decorators';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../../shared/auth/guards';
import { IAuthUser } from '../../shared/auth/model';
import { ReviewInput } from './dto';
import { ReviewView } from './model/review-view.model';
import { ReviewService } from './review.service';

@Resolver(() => ReviewView)
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  /** Public: a supplier's reviews, newest first. `isMine` needs a token. */
  @UseGuards(OptionalJwtAuthGuard)
  @Query(() => [ReviewView])
  public async supplierReviews(
    @Args('supplierId', { type: () => Int }) supplierId: number,
    @CurrentUser() user: IAuthUser | null,
  ): Promise<ReviewView[]> {
    return this.reviewService.listForSupplier(supplierId, user ? Number(user.sub) : null);
  }

  /** Create or replace the signed-in customer's review of a supplier. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Mutation(() => ReviewView)
  public async saveReview(
    @Args('data') data: ReviewInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<ReviewView> {
    return this.reviewService.upsert(Number(user.sub), data);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  public async deleteReview(
    @Args('reviewId', { type: () => Int }) reviewId: number,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return this.reviewService.remove(Number(user.sub), reviewId);
  }
}
