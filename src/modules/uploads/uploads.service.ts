import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateS3Key,
  buildCdnUrl,
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

    // Select the correct S3 bucket
    const bucket = dto.folder === 'documents'
      ? process.env.S3_BUCKET_DOCUMENTS as string
      : process.env.S3_BUCKET_PRODUCTS  as string;

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
    // For private documents return a pre-signed download URL
    if (dto.folder === 'documents') {
      const url = await getPresignedDownloadUrl(
        process.env.S3_BUCKET_DOCUMENTS as string,
        dto.fileKey,
        3600
      );
      return { fileKey: dto.fileKey, url };
    }

    // For public files return the CDN URL
    const url = buildCdnUrl(dto.fileKey);
    return { fileKey: dto.fileKey, url };
  }
}