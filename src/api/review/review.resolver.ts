import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { Review, ReviewSelect } from '../supplier/model';
import { ReviewService } from './review.service';
import { ReviewCreateInput, ReviewDeleteInput, ReviewUpdateInput } from './dto';

@Resolver(() => Review)
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  @Mutation(() => Review)
  public async createReview(
    @Args('data') data: ReviewCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<ReviewSelect>,
  ): Promise<Review> {
    return await this.reviewService.create(data, fields);
  }

  @Mutation(() => Review)
  public async updateReview(
    @Args('data') data: ReviewUpdateInput,
    @GraphQLFields() { fields }: IGraphQLFields<ReviewSelect>,
  ): Promise<Review> {
    return await this.reviewService.update(data, fields);
  }

  @Mutation(() => Boolean)
  public async deleteReview(
    @Args('data') data: ReviewDeleteInput,
  ): Promise<boolean> {
    return await this.reviewService.delete(data);
  }
}
