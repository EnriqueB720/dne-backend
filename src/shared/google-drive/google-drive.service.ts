import { Injectable } from '@nestjs/common'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { PrismaService } from '../datasource/prisma/prisma.service'

@Injectable()
export class GoogleDriveService {

  private drive

  constructor(private readonly prismaService: PrismaService) {

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    })

    this.drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    })
  }

  async uploadFile(file: Express.Multer.File, userOrPostId: number, isUser: boolean) {

    const stream = new Readable()
    stream.push(file.buffer)
    stream.push(null)

    const response = await this.drive.files.create({
      requestBody: {
        name: isUser ? `${file.originalname}-user` : `${file.originalname}-post`,
        parents: [isUser ? process.env.GOOGLE_DRIVE_FOLDER_ID : process.env.GOOGLE_DRIVE_POSTS_FOLDER_ID],
      },
      media: {
        mimeType: file.mimetype,
        body: stream,
      },
      fields: 'id',
    })

    const fileId = response.data.id

    await this.drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    if(isUser){
      // Update user's profile picture
    await  this.prismaService.user.update({
        where: { userId: userOrPostId },
        data: { profilePicture: `https://drive.google.com/uc?export=view&id=${fileId}` },
      })
    }else{
      // Update post's media URL
    await this.prismaService.post.update({
        where: { postId: userOrPostId },
        data: { profilePicture: `https://drive.google.com/uc?export=view&id=${fileId}` },
      });
    }

    return { url: `https://drive.google.com/uc?export=view&id=${fileId}` }
  }
}