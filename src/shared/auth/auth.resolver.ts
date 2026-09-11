import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
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

  // 5 attempts / minute per IP — enough for a real user typing their
  // password wrong a few times, tight enough to make credential-
  // stuffing painful.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Query(() => LoginOutput)
  login(@Args('data') data: LoginUserInput) {
    return this.authService.login(data);
  }

  // 3 signups / minute per IP — real signup flow rarely needs more;
  // blocks bulk account creation.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  // 3 requests / minute per IP — matches the "spam-my-inbox" attack
  // surface once Resend is wired. Also bounds AI-cost embedding calls.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Mutation(() => PasswordResetResult)
  requestPasswordReset(@Args('data') data: RequestPasswordResetInput) {
    return this.authService.requestPasswordReset(data);
  }

  /**
   * Consumes a reset token. Rejects invalid / expired / already-used
   * tokens with a BadRequestException so the UI can show a "link no
   * longer valid" state.
   */
  // 5 attempts / minute per IP — a bounded window so an attacker can't
  // brute-force the 64-char hex token space by rapid retry.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
