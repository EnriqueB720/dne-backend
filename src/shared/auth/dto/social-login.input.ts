import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsNotEmpty } from 'class-validator';

@InputType()
export class SocialLoginInput {
  /** Which OAuth provider issued the token below. */
  @IsIn(['google', 'github'])
  @Field()
  provider: string;

  /**
   * The provider credential to verify server-side:
   * - google: the OpenID Connect `id_token` (a JWT) — its `aud` must match GOOGLE_CLIENT_ID.
   * - github: the OAuth `access_token` — used to call the GitHub API.
   * The backend never trusts the client's claimed identity; it re-verifies.
   */
  @IsNotEmpty()
  @Field()
  token: string;
}
