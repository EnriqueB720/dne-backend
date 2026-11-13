import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, GraphQLFields, IGraphQLFields } from '@decorators';

import { IAuthUser } from '../../shared/auth/model';
import { JwtAuthGuard } from '../../shared/auth/guards';
import { Review, ReviewSelect } from '../supplier/model';
import { ReviewService } from './review.service';
import { ReviewCreateInput, ReviewDeleteInput, ReviewUpdateInput } from './dto';

/**
 * Every review write needs a signed-in user — the reviewer is taken from
 * the token, not from the input.
 */
@Resolver(() => Review)
@UseGuards(JwtAuthGuard)
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  @Mutation(() => Review)
  public async createReview(
    @Args('data') data: ReviewCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<ReviewSelect>,
    @CurrentUser() user: IAuthUser,
  ): Promise<Review> {
    return await this.reviewService.create(data, fields, Number(user.sub));
  }

  @Mutation(() => Review)
  public async updateReview(
    @Args('data') data: ReviewUpdateInput,
    @GraphQLFields() { fields }: IGraphQLFields<ReviewSelect>,
    @CurrentUser() user: IAuthUser,
  ): Promise<Review> {
    return await this.reviewService.update(data, fields, Number(user.sub));
  }

  @Mutation(() => Boolean)
  public async deleteReview(
    @Args('data') data: ReviewDeleteInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<boolean> {
    return await this.reviewService.delete(data, Number(user.sub));
  }
}
