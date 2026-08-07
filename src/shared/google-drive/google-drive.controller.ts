import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
// Re-authorization flow at the bottom of this file also needs:
//   ForbiddenException, Query from '@nestjs/common'
//   { google } from 'googleapis'
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { GoogleDriveService, UploadOwnerType } from './google-drive.service';
import type { MulterFile } from './uploaded-file.type';

@Controller('files')
export class GoogleDriveController {
  constructor(private readonly driveService: GoogleDriveService) {}

  /**
   * `ownerType` is the current way to say what the file attaches to
   * ('user' | 'post' | 'supplier'). The older `isUser` flag is still
   * honoured so existing callers keep working.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: MulterFile,
               @Body('userOrPostId') userOrPostId: number,
               @Body('ownerId') ownerId: number,
               @Body('ownerType') ownerType: string,
               @Body('isUser') isUser: string) {
    const resolvedType: UploadOwnerType =
      ownerType === 'supplier' || ownerType === 'post' || ownerType === 'user'
        ? ownerType
        : isUser === 'true'
          ? 'user'
          : 'post';

    return this.driveService.uploadFile(
      file,
      Number(ownerId ?? userOrPostId),
      resolvedType,
    );
  }

  /**
   * Serve a stored image through our own API rather than linking the
   * browser at drive.google.com — see `GoogleDriveService.streamMedia`.
   *
   * The bytes behind a given id never change, so this is safe to cache
   * hard. `Cross-Origin-Resource-Policy: cross-origin` lets the frontend
   * on another port render it.
   */
  @Get('media/:mediaAssetId')
  async media(
    @Param('mediaAssetId') mediaAssetId: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType } = await this.driveService.streamMedia(
      Number(mediaAssetId),
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // A mid-flight Drive failure can't become a JSON error — headers are
    // already out — so just close the response and let the <img> fall back.
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }

  // ───────────────────────────────────────────────────────────────────
  // Drive re-authorization — kept commented out because these hand OAuth
  // tokens to any unauthenticated caller. Uncomment (along with the Get,
  // Query, ForbiddenException and `google` imports above) when uploads
  // start failing with `invalid_grant`, which means GOOGLE_REFRESH_TOKEN
  // expired.
  //
  // 1. GET /files/google-auth  → open the returned consent URL, approve
  // 2. the redirect hits /files/callback → copy `refresh_token`
  // 3. paste into GOOGLE_REFRESH_TOKEN in .env.local, restart, re-comment
  //
  // Google expires refresh tokens after 7 days while the OAuth consent
  // screen sits in "Testing". Publishing it makes them long-lived.
  // ───────────────────────────────────────────────────────────────────

  // @Get('google-auth')
  // getGoogleAuth() {
  //   this.assertNotProduction();
  //
  //   const oauth2Client = new google.auth.OAuth2(
  //     process.env.GOOGLE_CLIENT_ID,
  //     process.env.GOOGLE_CLIENT_SECRET,
  //     this.callbackUrl(),
  //   );
  //
  //   const url = oauth2Client.generateAuthUrl({
  //     access_type: 'offline',
  //     // `consent` forces Google to issue a refresh token even when this
  //     // account already granted the scope.
  //     prompt: 'consent',
  //     scope: ['https://www.googleapis.com/auth/drive'],
  //   });
  //
  //   return { url };
  // }

  // @Get('callback')
  // async oauthCallback(@Query('code') code: string) {
  //   this.assertNotProduction();
  //
  //   const oauth2Client = new google.auth.OAuth2(
  //     process.env.GOOGLE_CLIENT_ID,
  //     process.env.GOOGLE_CLIENT_SECRET,
  //     this.callbackUrl(),
  //   );
  //
  //   const { tokens } = await oauth2Client.getToken(code);
  //
  //   return {
  //     refresh_token: tokens.refresh_token,
  //     next: 'Put this value in GOOGLE_REFRESH_TOKEN in .env.local, then restart the API.',
  //   };
  // }

  // private callbackUrl(): string {
  //   return (
  //     process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI ??
  //     'http://localhost:5000/files/callback'
  //   );
  // }

  // private assertNotProduction(): void {
  //   if (process.env.NODE_ENV === 'production') {
  //     throw new ForbiddenException('Drive re-authorization is a local-only flow');
  //   }
  // }
}
