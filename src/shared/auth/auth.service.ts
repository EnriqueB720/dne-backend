import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
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
import { UserSelect } from 'src/api/user/model';
import { User } from 'src/api/user/model/user.model';
import { UserService } from 'src/api/user/user.service';
import { SupplierService } from 'src/api/supplier/supplier.service';
import { Role } from '@prisma/client';
import { PrismaService } from '@prisma-datasource';

const USER_PROFILE_SELECT = {
  userId: true,
  email: true,
  name: true,
  phone: true,
  language: true,
  country: true,
  role: true,
  profilePicture: true,
  isCustomer: true,
  isSupplier: true,
  isAdmin: true,
  createdAt: true,
  subscription: {
    select: {
      subscriptionId: true,
      userId: true,
      planId: true,
      plan: {
        select: {
          planId: true,
          planName: true,
          price: true,
          features: true,
        },
      },
      status: true,
      startDate: true,
      endDate: true,
    },
  },
  supplier: {
    select: {
      supplierId: true,
      companyName: true,
    },
  },
  customer: {
    select: {
      customerId: true,
      userId: true,
      defaultCity: true,
      marketingOptIn: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

interface SocialProfile {
  providerId: string;
  email: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  // Verifies Google id_tokens against the same OAuth client the frontend
  // (NextAuth) signs in with — `aud` must equal GOOGLE_CLIENT_ID.
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly supplierService: SupplierService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Mints the app's own short-lived JWT for a loaded user record. This is the
   * single source of the token every GraphQL guard validates — email/password
   * login, token refresh and social login all funnel through here.
   */
  private issueToken(user: User): LoginOutput {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return {
      access_token: this.jwtService.sign({
        email: user.email,
        sub: user.userId,
        expiresIn: '1h',
        expiresAt,
      }),
      expiresAt,
      user,
    } as LoginOutput;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prismaService.user.findFirst({
      where: { email },
      select: USER_PROFILE_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('Email is incorrect');
    }

    const userPassword = await this.userService.findUserPassword({
      where: { email },
    });

    // OAuth-only accounts have no password — they must use social login.
    if (!userPassword) {
      throw new UnauthorizedException(
        'This account uses social login. Continue with Google or GitHub.',
      );
    }

    const valid = await bcrypt.compare(password, userPassword);

    if (!valid) {
      throw new UnauthorizedException('Invalid password');
    }

    return user as unknown as User;
  }

  async login({ email, password }: LoginUserInput) {
    const user = await this.validateUser(email, password);
    if (!user) return null;

    return this.issueToken(user);
  }

  async signup(input: SignUpInput, _select: UserSelect) {
    const existingPassword = await this.userService.findUserPassword({
      where: { email: input.email },
    });
    if (existingPassword) {
      throw new ConflictException('User already exists');
    }

    const role = (input.role ?? 'CUSTOMER').toUpperCase();
    if (role !== 'CUSTOMER' && role !== 'SUPPLIER') {
      throw new BadRequestException('role must be CUSTOMER or SUPPLIER');
    }

    if (role === 'SUPPLIER') {
      if (!input.companyName || input.companyName.trim() === '') {
        throw new BadRequestException('companyName is required for suppliers');
      }
      const taken = await this.supplierService.companyNameExists(
        input.companyName,
      );
      if (taken) {
        throw new ConflictException('Company name already exists');
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const baseUser = {
      email: input.email,
      name: input.name,
      phone: input.phone,
      country: input.country,
      password: passwordHash,
      // Legacy single-role enum has no CUSTOMER value; the multi-role flags
      // (isCustomer / isSupplier / isAdmin) are the real source of truth.
      role: Role.SUPPLIER,
      profilePicture: input.profilePicture,
    };

    if (role === 'CUSTOMER') {
      return this.prismaService.user.create({
        data: {
          ...baseUser,
          isCustomer: true,
          isSupplier: false,
          customer: { create: {} },
        },
        select: USER_PROFILE_SELECT,
      });
    }

    return this.prismaService.user.create({
      data: {
        ...baseUser,
        isCustomer: false,
        isSupplier: true,
        supplier: { create: { companyName: input.companyName! } },
        subscription: {
          create: [
            {
              planId: 1,
              status: 'ACTIVE',
              startDate: new Date(),
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
      select: USER_PROFILE_SELECT,
    });
  }

  async refreshUser(token: string) {
    const token_decoded = this.jwtService.decode(token);

    if (!token_decoded || new Date() > new Date(token_decoded.expiresAt)) {
      return null;
    }

    const user = await this.prismaService.user.findFirst({
      where: { email: token_decoded.email },
      select: USER_PROFILE_SELECT,
    });

    if (!user) return null;

    return this.issueToken(user as unknown as User);
  }

  // ── Password reset ────────────────────────────────────────────────────

  /**
   * Starts a "forgot password" flow. Always resolves successfully so an
   * attacker can't enumerate registered emails by watching for errors.
   *
   * When the email matches a real user, we mint a cryptographically
   * random 64-char hex token, store it with a 1-hour expiry, and — since
   * there's no email service yet — return the reset URL directly in the
   * response so the UI can display it as a "dev preview" link. When an
   * email service lands later, `resetUrl` becomes always-null and the
   * link is sent by email instead.
   */
  async requestPasswordReset(
    { email }: RequestPasswordResetInput,
  ): Promise<PasswordResetResult> {
    const user = await this.prismaService.user.findFirst({
      where: { email, deletedAt: null },
      select: { userId: true, password: true },
    });

    // OAuth-only accounts (no password) can't use this flow because there's
    // no password to reset — return the same happy shape without emitting a
    // token to keep the response uniform.
    if (!user || !user.password) {
      return { ok: true, resetUrl: null };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prismaService.passwordResetToken.create({
      data: { userId: user.userId, token, expiresAt },
    });

    // FRONTEND_BASE_URL lets non-local environments (staging/preview) mint
    // the correct hostname without code changes. Falls back to the local
    // dev server so the demo works out of the box.
    const base = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000';
    const resetUrl = `${base.replace(/\/$/, '')}/reset-password/${token}`;
    return { ok: true, resetUrl };
  }

  /**
   * Consumes a password-reset token. Rejects tokens that don't exist,
   * have expired, or were already used. On success, bcrypt-hashes the
   * new password and stamps the token as consumed so it can't be reused.
   */
  async resetPassword(
    { token, newPassword }: ResetPasswordInput,
  ): Promise<PasswordResetResult> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const row = await this.prismaService.passwordResetToken.findUnique({
      where: { token },
    });

    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the password and mark the token used in a single transaction
    // so a crash between the two writes can't leave a consumable token
    // paired with the new password.
    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { userId: row.userId },
        data: { password: passwordHash },
      }),
      this.prismaService.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  // ── Social login (OAuth) ──────────────────────────────────────────────

  /**
   * Logs a user in from a verified OAuth identity. NextAuth performs the
   * provider handshake on the frontend and forwards the resulting token here;
   * we re-verify it server-side, then find-or-link-or-create the user and
   * return the same JWT every other flow uses.
   *
   * Brand-new users are created in a "pending" state (no customer/supplier
   * profile, both role flags false). The frontend sends them through
   * onboarding to choose a role before they can act.
   */
  async socialLogin({ provider, token }: SocialLoginInput): Promise<LoginOutput> {
    const profile =
      provider === 'google'
        ? await this.verifyGoogleToken(token)
        : await this.verifyGithubToken(token);

    // 1) Already linked to this exact provider identity → log straight in.
    const account = await this.prismaService.oAuthAccount.findUnique({
      where: {
        provider_providerId: { provider, providerId: profile.providerId },
      },
      select: { userId: true },
    });

    if (account) {
      const user = await this.prismaService.user.findFirst({
        where: { userId: account.userId },
        select: USER_PROFILE_SELECT,
      });
      return this.issueToken(user as unknown as User);
    }

    // 2) A user already exists with this (verified) email → link the provider
    //    to that account instead of creating a duplicate.
    const existing = await this.prismaService.user.findFirst({
      where: { email: profile.email },
      select: USER_PROFILE_SELECT,
    });

    if (existing) {
      await this.prismaService.oAuthAccount.create({
        data: {
          userId: (existing as unknown as User).userId!,
          provider,
          providerId: profile.providerId,
        },
      });
      return this.issueToken(existing as unknown as User);
    }

    // 3) Brand-new person → create a pending account (no role yet).
    const name = await this.uniqueName(
      profile.name?.trim() || profile.email.split('@')[0],
    );

    const created = await this.prismaService.user.create({
      data: {
        email: profile.email,
        name,
        // OAuth never supplies these; country defaults until onboarding.
        country: 'CR',
        profilePicture: profile.picture,
        avatarUrl: profile.picture,
        emailVerifiedAt: new Date(),
        // Legacy single-role enum has no neutral value; the multi-role flags
        // (both false here) are the real source of truth for "pending".
        role: Role.SUPPLIER,
        isCustomer: false,
        isSupplier: false,
        oauthAccounts: { create: { provider, providerId: profile.providerId } },
      },
      select: USER_PROFILE_SELECT,
    });

    return this.issueToken(created as unknown as User);
  }

  /**
   * Finishes a social signup: the pending user picks CUSTOMER or SUPPLIER and
   * supplies the data OAuth couldn't (company name, phone). Returns a fresh
   * token reflecting the now-complete profile. No-ops (just re-issues) if the
   * user already has a role, so it's safe to call more than once.
   */
  async completeOnboarding(
    userId: number,
    input: CompleteOnboardingInput,
  ): Promise<LoginOutput> {
    const current = await this.prismaService.user.findFirst({
      where: { userId },
      select: { isCustomer: true, isSupplier: true },
    });

    if (!current) {
      throw new UnauthorizedException('User not found');
    }

    if (current.isCustomer || current.isSupplier) {
      const user = await this.prismaService.user.findFirst({
        where: { userId },
        select: USER_PROFILE_SELECT,
      });
      return this.issueToken(user as unknown as User);
    }

    const role = input.role.toUpperCase();

    if (input.phone) {
      const phoneTaken = await this.prismaService.user.findFirst({
        where: { phone: input.phone, NOT: { userId } },
        select: { userId: true },
      });
      if (phoneTaken) {
        throw new ConflictException('Phone number already in use');
      }
    }

    const base = {
      phone: input.phone ?? undefined,
      country: input.country ?? undefined,
    };

    if (role === 'CUSTOMER') {
      const user = await this.prismaService.user.update({
        where: { userId },
        data: {
          ...base,
          isCustomer: true,
          isSupplier: false,
          customer: { create: {} },
        },
        select: USER_PROFILE_SELECT,
      });
      return this.issueToken(user as unknown as User);
    }

    // SUPPLIER
    if (!input.companyName || input.companyName.trim() === '') {
      throw new BadRequestException('companyName is required for suppliers');
    }
    if (await this.supplierService.companyNameExists(input.companyName)) {
      throw new ConflictException('Company name already exists');
    }

    // Attach a 14-day trial only if this environment actually has a pricing
    // plan seeded. Hardcoding planId:1 blows up the FK when the plan table is
    // empty (e.g. a fresh dev DB), so look one up instead.
    const trialPlan = await this.prismaService.pricingPlan.findFirst({
      orderBy: { planId: 'asc' },
      select: { planId: true },
    });

    const user = await this.prismaService.user.update({
      where: { userId },
      data: {
        ...base,
        isCustomer: false,
        isSupplier: true,
        supplier: { create: { companyName: input.companyName } },
        ...(trialPlan
          ? {
              subscription: {
                create: [
                  {
                    planId: trialPlan.planId,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                  },
                ],
              },
            }
          : {}),
      },
      select: USER_PROFILE_SELECT,
    });
    return this.issueToken(user as unknown as User);
  }

  // ── Provider token verification ───────────────────────────────────────

  private async verifyGoogleToken(idToken: string): Promise<SocialProfile> {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Google token has no email');
    }
    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    return {
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  }

  private async verifyGithubToken(accessToken: string): Promise<SocialProfile> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'DnE-Backend',
    };

    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) {
      throw new UnauthorizedException('Invalid GitHub token');
    }
    const gh: any = await userRes.json();

    // The /user endpoint omits the email unless it's public; fall back to the
    // dedicated emails endpoint and pick the verified primary.
    let email: string | undefined = gh.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers,
      });
      if (emailsRes.ok) {
        const emails: any[] = await emailsRes.json();
        const primary =
          emails.find((e) => e.primary && e.verified) ??
          emails.find((e) => e.verified);
        email = primary?.email;
      }
    }

    if (!email) {
      throw new UnauthorizedException(
        'Could not read a verified email from GitHub',
      );
    }

    return {
      providerId: String(gh.id),
      email,
      name: gh.name || gh.login,
      picture: gh.avatar_url,
    };
  }

  /**
   * `User.name` is unique, but provider display names collide ("Juan Pérez").
   * Append a numeric suffix until we find a free name.
   */
  private async uniqueName(base: string): Promise<string> {
    const candidate = base.slice(0, 90);
    let name = candidate;
    let n = 1;
    while (
      await this.prismaService.user.findFirst({
        where: { name },
        select: { userId: true },
      })
    ) {
      n += 1;
      name = `${candidate} ${n}`;
    }
    return name;
  }
}
