export interface UserProfileResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateMyProfileDto {
  /** @minLength 2 @maxLength 50 @pattern ^[a-zA-Z\\s'-]+$ */
  firstName?: string;

  /** @minLength 2 @maxLength 50 @pattern ^[a-zA-Z\\s'-]+$ */
  lastName?: string;

  /** @format uri */
  avatarUrl?: string | null;
}
