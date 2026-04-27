import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as dotenv from 'dotenv';
dotenv.config();

export const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// Generate a pre-signed URL for uploading a file directly to S3
// The client uploads directly — bytes never touch your server
export async function getPresignedUploadUrl(
  bucket:      string,
  key:         string,
  contentType: string,
  expiresIn =  300 // 5 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// Generate a pre-signed URL for downloading a private file
// Used for vendor documents visible only to admins
export async function getPresignedDownloadUrl(
  bucket:    string,
  key:       string,
  expiresIn = 300
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// Delete a file from S3
export async function deleteS3Object(
  bucket: string,
  key:    string
): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await s3Client.send(command);
}

export async function headS3Object(
  bucket: string,
  key: string
) {
  const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
  return s3Client.send(command);
}

// Build a CloudFront CDN URL for a public product image
export function buildCdnUrl(key: string): string {
  const domain = process.env.CLOUDFRONT_DOMAIN as string;
  return `${domain}/${key}`;
}

// Generate a unique S3 key for a file
export function generateS3Key(
  folder:    string,
  userId:    string,
  filename:  string
): string {
  const timestamp = Date.now();
  const ext       = filename.split('.').pop();
  return `${folder}/${userId}/${timestamp}.${ext}`;
}
