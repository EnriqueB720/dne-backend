import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { PrismaService } from '../datasource/prisma/prisma.service'

/** What the uploaded file gets attached to. */
export type UploadOwnerType = 'user' | 'post' | 'supplier'

const MAX_GALLERY_BYTES = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])

@Injectable()
export class GoogleDriveService {

  private readonly logger = new Logger(GoogleDriveService.name)

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

  /**
   * A browser-renderable URL for a public Drive file.
   *
   * NOT `uc?export=view` — that endpoint answers with
   * `Cross-Origin-Resource-Policy: same-site`, so any <img> outside
   * google.com is blocked and renders as an empty box. The `thumbnail`
   * endpoint sends no CORP header and `Content-Disposition: inline`, so it
   * embeds anywhere. `sz=w<N>` caps the long edge.
   *
   * Kept as a fallback/record only — gallery photos are served through
   * `streamMedia` instead, because Google throttles a browser that asks
   * for several of these at once and the failed ones render blank until a
   * reload. See GET /files/media/:mediaAssetId.
   */
  private driveImageUrl(fileId: string, width: number): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`
  }

  /** Pull the Drive file id out of a legacy stored URL (`...id=<ID>&...`). */
  private fileIdFromUrl(url: string | null | undefined): string | null {
    if (!url) return null
    const match = /[?&]id=([^&]+)/.exec(url)
    return match ? match[1] : null
  }

  /**
   * Stream a stored image back through our own API.
   *
   * Pointing <img> straight at drive.google.com looked fine in isolation
   * but fell over on a real gallery: Google throttles concurrent thumbnail
   * requests from a non-Google origin, so some tiles came back empty and
   * only filled in after a reload or two. Proxying makes image loading as
   * reliable as any other request to our backend, and it stops the
   * storefront depending on files being world-readable on Drive.
   */
  async streamMedia(mediaAssetId: number): Promise<{
    stream: Readable
    mimeType: string
  }> {
    if (!Number.isFinite(mediaAssetId) || mediaAssetId <= 0) {
      throw new BadRequestException('Invalid image id')
    }

    const asset = await this.prismaService.mediaAsset.findUnique({
      where: { mediaAssetId },
      select: {
        storageFileId: true,
        url: true,
        mimeType: true,
        deletedAt: true,
      },
    })
    if (!asset || asset.deletedAt) {
      throw new NotFoundException('Image not found')
    }

    const fileId = asset.storageFileId ?? this.fileIdFromUrl(asset.url)
    if (!fileId) {
      throw new NotFoundException('Image has no stored file reference')
    }

    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
      )
      return {
        stream: response.data as Readable,
        mimeType: asset.mimeType || 'application/octet-stream',
      }
    } catch (err) {
      throw this.toReadableDriveError(err)
    }
  }

  /**
   * Remove the underlying Drive file. Best effort: a already-missing file
   * (404) counts as success, and any other failure is logged rather than
   * thrown so removing a photo from the storefront never blocks on Google.
   */
  async deleteStoredFile(fileId: string | null | undefined): Promise<boolean> {
    if (!fileId) return false
    try {
      await this.drive.files.delete({ fileId })
      return true
    } catch (err) {
      const status = (err as any)?.code ?? (err as any)?.status
      if (status === 404) return true
      this.logger.warn(
        `Could not delete Drive file ${fileId}: ${(err as Error)?.message ?? 'unknown error'}`,
      )
      return false
    }
  }

  /**
   * Push the bytes to Drive, make the file world-readable, and return the
   * file id. Storage only — building URLs and attaching them to a row is
   * the caller's job.
   */
  private async pushToDrive(
    file: Express.Multer.File,
    nameSuffix: string,
    folderId: string,
  ): Promise<string> {
    const stream = new Readable()
    stream.push(file.buffer)
    stream.push(null)

    let fileId: string
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: `${file.originalname}-${nameSuffix}`,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: stream,
        },
        fields: 'id',
      })
      fileId = response.data.id

      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (err) {
      throw this.toReadableDriveError(err)
    }

    return fileId
  }

  /**
   * Google's client throws a 400-page GaxiosError for what is usually one
   * short, actionable problem. Translate the ones we can name so the caller
   * (and the provider staring at the upload button) gets a sentence instead
   * of a stack trace.
   *
   * `invalid_grant` is the common one: GOOGLE_REFRESH_TOKEN has been revoked
   * or expired. Google expires refresh tokens after 7 days while the OAuth
   * consent screen is still in "Testing" — re-authorize via
   * GET /files/google-auth to mint a fresh one.
   */
  private toReadableDriveError(err: unknown): Error {
    const reason =
      (err as any)?.response?.data?.error ?? (err as any)?.cause?.message ?? null

    if (reason === 'invalid_grant') {
      this.logger.error(
        'Google Drive refused the refresh token (invalid_grant). Re-authorize at GET /files/google-auth and put the new refresh_token in GOOGLE_REFRESH_TOKEN.',
      )
      return new ServiceUnavailableException(
        'Image storage is not connected right now — the Google Drive authorization expired. Reconnect Drive and try again.',
      )
    }

    this.logger.error(
      `Google Drive upload failed: ${(err as Error)?.message ?? 'unknown error'}`,
    )
    return new ServiceUnavailableException(
      'Could not save the image to storage. Please try again.',
    )
  }

  async uploadFile(
    file: Express.Multer.File,
    ownerId: number,
    ownerType: UploadOwnerType,
  ) {
    if (!file) {
      throw new BadRequestException('No file was uploaded')
    }
    if (!Number.isFinite(ownerId) || ownerId <= 0) {
      throw new BadRequestException('A valid owner id is required')
    }

    if (ownerType === 'supplier') {
      return await this.uploadSupplierPhoto(file, ownerId)
    }

    const isUser = ownerType === 'user'
    const fileId = await this.pushToDrive(
      file,
      isUser ? 'user' : 'post',
      isUser
        ? process.env.GOOGLE_DRIVE_FOLDER_ID
        : process.env.GOOGLE_DRIVE_POSTS_FOLDER_ID,
    )
    const url = this.driveImageUrl(fileId, 1600)

    if (isUser) {
      // Update user's profile picture
      await this.prismaService.user.update({
        where: { userId: ownerId },
        data: { profilePicture: url },
      })
    } else {
      // Update post's media URL
      await this.prismaService.post.update({
        where: { postId: ownerId },
        data: { media_url: url },
      });
    }

    return { url }
  }

  /**
   * Storefront gallery photo. Unlike user/post uploads (which overwrite a
   * single column) a supplier accumulates photos, so each one becomes a
   * MediaAsset row appended to the end of the gallery order.
   */
  private async uploadSupplierPhoto(
    file: Express.Multer.File,
    supplierId: number,
  ) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Gallery photos must be PNG, JPEG, WebP or GIF',
      )
    }
    if (file.size > MAX_GALLERY_BYTES) {
      throw new BadRequestException('Gallery photos must be 8MB or smaller')
    }

    const supplier = await this.prismaService.supplier.findUnique({
      where: { supplierId },
      select: { supplierId: true },
    })
    if (!supplier) {
      throw new BadRequestException('Supplier not found')
    }

    const fileId = await this.pushToDrive(
      file,
      `supplier-${supplierId}`,
      // Storefront photos live alongside user uploads, not post media.
      process.env.GOOGLE_DRIVE_FOLDER_ID,
    )
    // Full-size for the profile hero, a small one for grid tiles.
    const url = this.driveImageUrl(fileId, 1600)
    const thumbnailUrl = this.driveImageUrl(fileId, 400)

    // Append: one past the current highest position.
    const last = await this.prismaService.mediaAsset.findFirst({
      where: { supplierId, deletedAt: null },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    })

    const asset = await this.prismaService.mediaAsset.create({
      data: {
        ownerType: 'supplier',
        ownerId: supplierId,
        supplierId,
        storageProvider: 'google-drive',
        storageFileId: fileId,
        url,
        thumbnailUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        displayOrder: (last?.displayOrder ?? -1) + 1,
      },
      select: { mediaAssetId: true, url: true, displayOrder: true },
    })

    return { url, mediaAssetId: asset.mediaAssetId, displayOrder: asset.displayOrder }
  }
}
