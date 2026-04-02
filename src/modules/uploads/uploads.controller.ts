import {
  Controller, Route, Tags, Post,
  Body, Security, Request,
  SuccessResponse, Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { UploadsService }            from './uploads.service';
import {
  PresignUploadDto,
  PresignUploadResponseDto,
  ConfirmUploadDto,
  ConfirmUploadResponseDto,
} from './uploads.dto';

@Route('uploads')
@Tags('Uploads')
@Security('jwt')
export class UploadsController extends Controller {
  private service = new UploadsService();

  /**
   * Step 1 of 2 — Request a pre-signed S3 upload URL.
   * The client then PUTs the file directly to S3 using this URL.
   * The file never passes through the API server.
   */
  @Post('presign')
  @SuccessResponse(200, 'Pre-signed URL generated')
  @Response(400, 'File type not allowed')
  async presign(
    @Request() req: ExpressRequest,
    @Body() body: PresignUploadDto
  ): Promise<PresignUploadResponseDto> {
    return this.service.getPresignedUrl(body, req.user!);
  }

  /**
   * Step 2 of 2 — Confirm the upload completed and get the final URL.
   * Call this after successfully uploading to S3.
   */
  @Post('confirm')
  @SuccessResponse(200, 'Upload confirmed')
  async confirm(
    @Request() req: ExpressRequest,
    @Body() body: ConfirmUploadDto
  ): Promise<ConfirmUploadResponseDto> {
    return this.service.confirmUpload(body, req.user!);
  }
}