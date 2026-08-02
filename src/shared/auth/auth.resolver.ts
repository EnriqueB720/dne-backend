import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CompleteOnboardingInput,
  LoginOutput,
  LoginUserInput,
  PasswordResetResult,
  RequestPasswordResetInput,
  ResetPasswordInput,
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

  /**
   * "Forgot your password" — starts the flow. Always returns ok=true so
   * unregistered emails can't be enumerated. In dev (no email service),
   * `resetUrl` is populated when the account exists so the UI can show a
   * click-to-reset link inline.
   */
  @Mutation(() => PasswordResetResult)
  requestPasswordReset(@Args('data') data: RequestPasswordResetInput) {
    return this.authService.requestPasswordReset(data);
  }

  /**
   * Consumes a reset token. Rejects invalid / expired / already-used
   * tokens with a BadRequestException so the UI can show a "link no
   * longer valid" state.
   */
  @Mutation(() => PasswordResetResult)
  resetPassword(@Args('data') data: ResetPasswordInput) {
    return this.authService.resetPassword(data);
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
