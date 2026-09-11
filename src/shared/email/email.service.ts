import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * Thin wrapper around Resend for transactional email. Kept minimal so
 * swapping providers later (SendGrid, Postmark, SES) is a single-file
 * change. Non-Resend concerns (retry policy, template rendering,
 * unsubscribe headers for marketing mail) don't live here.
 *
 * `isEnabled()` returns false when RESEND_API_KEY is missing — in that
 * case the "send" methods no-op and log a warning, and the caller is
 * expected to fall back to dev-preview behaviour (e.g. the
 * requestPasswordReset response returning the URL directly). This
 * keeps local dev running without any Resend setup.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    // Default matches Resend's onboarding sandbox address so a
    // freshly-provisioned account can send test mail without owning
    // a verified domain yet. Override once solvocr.com's DNS is set up
    // (SPF/DKIM records that Resend gives you) via EMAIL_FROM env.
    this.fromAddress =
      process.env.EMAIL_FROM ?? 'Solvo <onboarding@resend.dev>';
  }

  public isEnabled(): boolean {
    return this.resend !== null;
  }

  /**
   * Password reset email. Kept as a first-class method (not a generic
   * `send(subject, body)`) so the template lives with the flow that
   * owns it and can evolve without touching every caller.
   */
  public async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Resend not configured — skipping password-reset email to ${to}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: 'Reset your Solvo password',
        html: buildPasswordResetHtml(resetUrl),
        text: buildPasswordResetText(resetUrl),
      });
    } catch (err) {
      // Never let email failures cascade into the auth path — the DB
      // token was already written, the user can still reset if they
      // re-request. Log and move on.
      this.logger.warn(
        `Resend password-reset email failed for ${to}: ${(err as Error).message}`,
      );
    }
  }
}

// Templates kept inline for now — two email variants total, both under
// 30 lines each. When the count grows past ~5, extract to a proper
// templates/ folder (or add a rendering library like @react-email/render).
function buildPasswordResetHtml(url: string): string {
  return `<!doctype html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 20px; color: #1c1917;">
  <h2 style="font-size: 20px; margin-bottom: 12px;">Reset your Solvo password</h2>
  <p>We got a request to reset your password. Click the link below to choose a new one. This link expires in 1 hour and can only be used once.</p>
  <p style="margin: 28px 0;">
    <a href="${url}" style="display: inline-block; padding: 12px 20px; background: #1c1917; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 600;">Reset password</a>
  </p>
  <p style="font-size: 13px; color: #78716c;">Didn't request this? You can safely ignore this email — no changes have been made to your account.</p>
  <p style="font-size: 12px; color: #a8a29e; margin-top: 32px;">If the button doesn't work, paste this into your browser:<br>${url}</p>
</body>
</html>`;
}

function buildPasswordResetText(url: string): string {
  return `Reset your Solvo password

We got a request to reset your password. Open the link below to choose a new one. This link expires in 1 hour and can only be used once.

${url}

Didn't request this? You can safely ignore this email — no changes have been made to your account.`;
}
