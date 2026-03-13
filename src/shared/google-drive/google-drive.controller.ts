import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoogleDriveService } from './google-drive.service';

@Controller('files')
export class GoogleDriveController {
  constructor(private readonly driveService: GoogleDriveService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File,
               @Body('userOrPostId') userOrPostId: number,
               @Body('isUser') isUser: string) {
    return this.driveService.uploadFile(file, Number(userOrPostId), isUser === 'true');
  }

  // @Get('google-auth')
  // getGoogleAuth() {
  //   const oauth2Client = new google.auth.OAuth2(
  //     process.env.GOOGLE_CLIENT_ID,
  //     process.env.GOOGLE_CLIENT_SECRET,
  //     'http://localhost:5000/files/callback',
  //   );

  //   const url = oauth2Client.generateAuthUrl({
  //     access_type: 'offline',
  //     prompt: 'consent',
  //     scope: ['https://www.googleapis.com/auth/drive'],
  //   });

  //   return { url };
  // }

  // @Get('callback')
  // async oauthCallback(@Query('code') code: string) {

  //   const oauth2Client = new google.auth.OAuth2(
  //     process.env.GOOGLE_CLIENT_ID,
  //     process.env.GOOGLE_CLIENT_SECRET,
  //     'http://localhost:5000/files/callback'
  //   )

  //   const { tokens } = await oauth2Client.getToken(code)

  //   console.log(tokens)

  //   return tokens
  // }
}
