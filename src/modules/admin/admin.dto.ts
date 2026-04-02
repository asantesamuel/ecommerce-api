// TODO: define request/response DTOs for admin
// Use class-validator decorators for tsoa validation

export interface ModerateProductDto {
  action: 'approve' | 'reject' | 'flag';
  /** @minLength 5 @maxLength 300 */
  reason?: string;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
  /** @minLength 5 @maxLength 300 */
  reason?: string;
}