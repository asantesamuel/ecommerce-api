import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateS3Key,
  buildCdnUrl,
  headS3Object,
} from '../../config/s3';
import { JwtPayload } from '../../utils/jwt';
import {
  PresignUploadDto,
  PresignUploadResponseDto,
  ConfirmUploadDto,
  ConfirmUploadResponseDto,
} from './uploads.dto';

// Allowed MIME types per folder
const ALLOWED_TYPES: Record<string, string[]> = {
  products:  ['image/jpeg', 'image/png', 'image/webp'],
  documents: [
    'image/jpeg', 'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  avatars:   ['image/jpeg', 'image/png', 'image/webp'],
};

// Max file sizes per folder in bytes
const MAX_SIZES: Record<string, number> = {
  products:  5  * 1024 * 1024, // 5 MB
  documents: 10 * 1024 * 1024, // 10 MB
  avatars:   2  * 1024 * 1024, // 2 MB
};

export class UploadsService {
  private getBucket(folder: 'products' | 'documents' | 'avatars'): string {
    return folder === 'documents'
      ? process.env.S3_BUCKET_DOCUMENTS as string
      : process.env.S3_BUCKET_PRODUCTS as string;
  }

  private getOwnedPrefix(
    folder: 'products' | 'documents' | 'avatars',
    userId: string
  ): string {
    return `${folder}/${userId}/`;
  }

  private assertOwnedKey(
    folder: 'products' | 'documents' | 'avatars',
    fileKey: string,
    userId: string
  ): void {
    const prefix = this.getOwnedPrefix(folder, userId);
    if (!fileKey.startsWith(prefix)) {
      const error: any = new Error('You do not have permission to use this uploaded file');
      error.status = 403;
      throw error;
    }
  }

  async getPresignedUrl(
    dto:         PresignUploadDto,
    currentUser: JwtPayload
  ): Promise<PresignUploadResponseDto> {
    // Validate content type for the folder
    const allowed = ALLOWED_TYPES[dto.folder];
    if (!allowed.includes(dto.contentType)) {
      const error: any = new Error(
        `File type "${dto.contentType}" is not allowed for ${dto.folder}. ` +
        `Allowed types: ${allowed.join(', ')}`
      );
      error.status = 400;
      throw error;
    }

    const maxSize = MAX_SIZES[dto.folder];
    if (!Number.isFinite(dto.fileSize) || dto.fileSize <= 0 || dto.fileSize > maxSize) {
      const error: any = new Error(
        `File size exceeds the ${dto.folder} limit of ${maxSize} bytes`
      );
      error.status = 400;
      throw error;
    }

    // Select the correct S3 bucket
    const bucket = this.getBucket(dto.folder);

    // Generate unique key
    const fileKey = generateS3Key(dto.folder, currentUser.sub, dto.filename);

    // Generate pre-signed upload URL
    const uploadUrl = await getPresignedUploadUrl(
      bucket,
      fileKey,
      dto.contentType,
      300
    );

    return { uploadUrl, fileKey, expiresIn: 300 };
  }

  async confirmUpload(
    dto:         ConfirmUploadDto,
    currentUser: JwtPayload
  ): Promise<ConfirmUploadResponseDto> {
    this.assertOwnedKey(dto.folder, dto.fileKey, currentUser.sub);

    const bucket = this.getBucket(dto.folder);

    try {
      await headS3Object(bucket, dto.fileKey);
    } catch {
      const error: any = new Error('Uploaded file was not found in storage');
      error.status = 400;
      throw error;
    }

    // For private documents return a pre-signed download URL
    if (dto.folder === 'documents') {
      const url = await getPresignedDownloadUrl(
        bucket,
        dto.fileKey,
        3600
      );
      return { fileKey: dto.fileKey, url };
    }

    // For public files return the CDN URL
    const url = buildCdnUrl(dto.fileKey);
    return { fileKey: dto.fileKey, url };
  }

  async assertOwnedUploadedFile(
    folder: 'products' | 'documents' | 'avatars',
    fileKey: string,
    currentUser: JwtPayload
  ): Promise<void> {
    this.assertOwnedKey(folder, fileKey, currentUser.sub);

    try {
      await headS3Object(this.getBucket(folder), fileKey);
    } catch {
      const error: any = new Error('Referenced uploaded file does not exist');
      error.status = 400;
      throw error;
    }
  }

  getPublicUrlForKey(fileKey: string): string {
    return buildCdnUrl(fileKey);
  }

  extractFileKeyFromPublicUrl(url: string): string | null {
    const base = process.env.CLOUDFRONT_DOMAIN as string;
    if (!url.startsWith(base)) {
      return null;
    }

    const prefix = `${base}/`;
    return url.slice(prefix.length) || null;
  }
}
