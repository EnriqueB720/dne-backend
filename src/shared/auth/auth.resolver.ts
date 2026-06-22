import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CompleteOnboardingInput,
  LoginOutput,
  LoginUserInput,
  SignUpInput,
  SocialLoginInput,
} from './dto';
import { JwtAuthGuard } from './guards';
import { AuthService } from './auth.service';
import { GraphQLFields, IGraphQLFields } from '../decorators';
import { CurrentUser } from '../decorators';
import { IAuthUser } from './model';
import { User, UserSelect } from 'src/api/user/model';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Query(() => LoginOutput)
  login(@Args('data') data: LoginUserInput) {
    return this.authService.login(data);
  }

  @Mutation(() => User)
  signup(
    @Args('data') data: SignUpInput,
    @GraphQLFields() { fields }: IGraphQLFields<UserSelect>,
  ) {
    return this.authService.signup(data, fields);
  }

  @Query(() => LoginOutput)
  refreshUser(@Args('data') data: string) {
    return this.authService.refreshUser(data);
  }

  /**
   * Exchanges a verified Google/GitHub token for the app's own JWT.
   * New users come back with both role flags false → the frontend routes
   * them to onboarding.
   */
  @Mutation(() => LoginOutput)
  socialLogin(@Args('data') data: SocialLoginInput) {
    return this.authService.socialLogin(data);
  }

  /** Finishes a social signup: pick CUSTOMER/SUPPLIER and fill in the gaps. */
  @Mutation(() => LoginOutput)
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @Args('data') data: CompleteOnboardingInput,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.authService.completeOnboarding(Number(user.sub), data);
  }
}
