/**
 * @minLength 2
 * @maxLength 50
 * @pattern ^[a-zA-Z\s'-]+$
 */
export type PersonName = string;

/**
 * @minLength 8
 * @maxLength 64
 * @pattern ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$
 */
export type StrongPassword = string;

export interface RegisterDto {
  /** @format email */
  email: string;

  password: StrongPassword;

  /**
   * @minLength 2
   * @maxLength 50
   * @pattern ^[a-zA-Z\s'-]+$
   */
  firstName: string;

  /**
   * @minLength 2
   * @maxLength 50
   * @pattern ^[a-zA-Z\s'-]+$
   */
  lastName: string;
}

export interface LoginDto {
  /** @format email */
  email: string;

  /** @minLength 1 */
  password: string;
}

export interface RefreshTokenDto {
  /** @minLength 1 */
  refreshToken: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}

export interface MessageResponseDto {
  message: string;
}