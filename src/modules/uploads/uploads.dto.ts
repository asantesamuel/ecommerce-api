// TODO: define request/response DTOs for uploads
// Use class-validator decorators for tsoa validation

export interface PresignUploadDto {
  /**
   * Original filename including extension
   * @minLength 1 @maxLength 200
   */
  filename: string;

  /**
   * MIME type of the file
   * @minLength 1 @maxLength 100
   */
  contentType: string;

  /**
   * Where the file will be used
   */
  folder: 'products' | 'documents' | 'avatars';
}

export interface PresignUploadResponseDto {
  uploadUrl:  string; // PUT this URL directly from the browser
  fileKey:    string; // save this — used to confirm the upload
  expiresIn:  number; // seconds until the URL expires
}

export interface ConfirmUploadDto {
  fileKey: string;
  folder:  'products' | 'documents' | 'avatars';
}

export interface ConfirmUploadResponseDto {
  fileKey: string;
  url:     string; // final CDN or access URL
}