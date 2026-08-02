import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Common shape for both `requestPasswordReset` and `resetPassword`.
 *
 * `ok` is always true from the request side — we return the same shape
 * regardless of whether the email exists, so an attacker can't harvest
 * addresses by watching for errors. `resetUrl` is populated only in
 * dev-mode requests where the account genuinely exists (there's no email
 * service yet, so the UI displays this link directly).
 */
@ObjectType()
export class PasswordResetResult {
  @Field(() => Boolean)
  ok: boolean;

  @Field(() => String, { nullable: true })
  resetUrl?: string | null;
}
