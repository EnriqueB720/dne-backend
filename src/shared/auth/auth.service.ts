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
import { PrismaService } from '@prisma-datasource';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';

/**
 * Session length. Short on purpose: the frontend renews the token every
 * 15 minutes while the app is open, so only an hour of no use signs you out.
 */
const TOKEN_LIFETIME_SECONDS = 60 * 60;

const USER_PROFILE_SELECT = {
  userId: true,
  email: true,
  name: true,
  phone: true,
  language: true,
  country: true,
  profilePicture: true,
  isCustomer: true,
  isSupplier: true,
  isAdmin: true,
  createdAt: true,
  supplier: { select: { supplierId: true, companyName: true } },
  customer: { select: { customerId: true } },
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
    private readonly emailService: EmailService,
    private readonly geoService: GeoService,
  ) {}

  /**
   * Mints the app's own short-lived JWT for a loaded user record. This is the
   * single source of the token every GraphQL guard validates — email/password
   * login, token refresh and social login all funnel through here.
   */
  private issueToken(user: User): LoginOutput {
    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_SECONDS * 1000);
    return {
      // `expiresIn` as a sign option writes the standard `exp` claim, which
      // passport-jwt enforces on every guarded resolver. The `expiresAt`
      // payload field is kept because the frontend reads it.
      access_token: this.jwtService.sign(
        {
          email: user.email,
          sub: user.userId,
          expiresIn: '1h',
          expiresAt,
        },
        { expiresIn: TOKEN_LIFETIME_SECONDS },
      ),
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

    const userPassword = await this.userService.findUserPassword(email);

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
    const existing = await this.prismaService.user.findUnique({
      where: { email: input.email },
      select: { userId: true },
    });
    if (existing) {
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
        supplier: { create: this.newSupplierData(input.companyName!, input.province) },
      },
      select: USER_PROFILE_SELECT,
    });
  }

  /**
   * Swap a still-valid token for a fresh one. The frontend calls this on
   * every page load and every few minutes while the app is open, so an
   * active session keeps sliding forward; one left unused past its hour
   * expires for good.
   */
  async refreshUser(token: string) {
    // `verify`, not `decode`: decode skips the signature check, which let
    // anyone hand-craft a token for any email and get a real one back.
    let token_decoded: { email?: string; expiresAt?: string } | null;
    try {
      token_decoded = this.jwtService.verify(token);
    } catch {
      return null;
    }

    // Tokens minted before `exp` was added carry only `expiresAt`.
    if (
      !token_decoded?.email ||
      (token_decoded.expiresAt && new Date() > new Date(token_decoded.expiresAt))
    ) {
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
   * When the email matches a real user we mint a cryptographically-random
   * 64-char hex token, store it with a 1-hour expiry, and dispatch the
   * link. Delivery mode differs by environment:
   *   - production: the link is emailed via Resend; the mutation
   *     returns `resetUrl = null` so the frontend shows a generic
   *     "check your inbox" state and nothing about token routing leaks.
   *   - non-production: no email is sent; `resetUrl` comes back inline
   *     so the developer can click it directly. This is the same
   *     workflow devs have used since the flow was first built and it
   *     keeps local iteration email-service-free.
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

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      // Non-blocking on the mutation response: the token is already
      // stored, the email fires with its own retry logic inside
      // EmailService, and delivery failures never turn into 500s for
      // the caller. Response stays generic to prevent enumeration.
      await this.emailService.sendPasswordReset(email, resetUrl);
      return { ok: true, resetUrl: null };
    }

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
const name = (profile.name?.trim() || profile.email.split('@')[0]).slice(0, 100);

    const created = await this.prismaService.user.create({
      data: {
        email: profile.email,
        name,
        // OAuth never supplies these; country defaults until onboarding.
        country: 'CR',
        profilePicture: profile.picture,
        emailVerifiedAt: new Date(),
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

    const user = await this.prismaService.user.update({
      where: { userId },
      data: {
        ...base,
        isCustomer: false,
        isSupplier: true,
        supplier: { create: this.newSupplierData(input.companyName, input.province) },
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


  /** A self-signup supplier row. Province (ISO 3166-2) is optional here and editable later. */
  private newSupplierData(companyName: string, province?: string | null) {
    const code = province && this.geoService.isProvinceCode(province) ? province.toUpperCase() : null;
    return {
      companyName: companyName.trim(),
      province: code,
      serviceProvinces: code ? [code] : [],
      claimedAt: new Date(),
    };
  }
}
