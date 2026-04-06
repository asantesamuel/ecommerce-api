import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../entities/User';
import { RefreshToken } from '../../entities/RefreshToken';
import { hashPassword, comparePassword } from '../../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  RefreshResponseDto,
} from './auth.dto';

const failedAttempts = new Map<string, { count: number; blockedUntil?: Date }>();
const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

function checkRateLimit(email: string): void {
  const record = failedAttempts.get(email);
  if (!record) return;

  if (record.blockedUntil && record.blockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (record.blockedUntil.getTime() - Date.now()) / 60000
    );
    const error: any = new Error(
      `Too many failed attempts. Try again in ${minutesLeft} minute(s).`
    );
    error.status = 429;
    throw error;
  }

  if (record.blockedUntil && record.blockedUntil <= new Date()) {
    failedAttempts.delete(email);
  }
}

function recordFailedAttempt(email: string): void {
  const record = failedAttempts.get(email) || { count: 0 };
  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);
  }
  failedAttempts.set(email, record);
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);
  private refreshTokenRepo = AppDataSource.getRepository(RefreshToken);

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      const error: any = new Error('An account with this email already exists');
      error.status = 409;
      throw error;
    }

    const passwordHash = await hashPassword(dto.password);
    const user = this.userRepo.create({
      email,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: UserRole.CUSTOMER,
    });
    await this.userRepo.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const tokenEntity = this.refreshTokenRepo.create({
      token: refreshToken,
      user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await this.refreshTokenRepo.save(tokenEntity);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    checkRateLimit(email);

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      recordFailedAttempt(email);
      const error: any = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    if (!user.isActive) {
      const error: any = new Error(
        'Your account has been suspended. Please contact support.'
      );
      error.status = 403;
      throw error;
    }

    const passwordValid = await comparePassword(
      dto.password,
      user.passwordHash
    );
    if (!passwordValid) {
      recordFailedAttempt(email);
      const error: any = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    clearFailedAttempts(email);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const tokenEntity = this.refreshTokenRepo.create({
      token: refreshToken,
      user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await this.refreshTokenRepo.save(tokenEntity);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    const existingToken = await this.refreshTokenRepo.findOne({
      where: { token: dto.refreshToken },
    });

    if (!existingToken) {
      const error: any = new Error('Invalid or revoked refresh token');
      error.status = 401;
      throw error;
    }

    let payload: any;
    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch (err: any) {
      await this.refreshTokenRepo.remove(existingToken);
      const error: any = new Error(
        err.name === 'TokenExpiredError'
          ? 'Refresh token has expired. Please log in again.'
          : 'Invalid refresh token'
      );
      error.status = 401;
      throw error;
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      // Clean up the token if user no longer exists or is suspended
      await this.refreshTokenRepo.remove(existingToken);
      const error: any = new Error(
        !user ? 'User no longer exists' : 'Account has been suspended'
      );
      error.status = !user ? 401 : 403;
      throw error;
    }

    // Generate new tokens for rotation
    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    // Save new token
    const newTokenEntity = this.refreshTokenRepo.create({
      token: newRefreshToken,
      user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepo.save(newTokenEntity);

    // Remove old token
    await this.refreshTokenRepo.remove(existingToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    const existingToken = await this.refreshTokenRepo.findOne({
      where: { token: dto.refreshToken },
    });

    if (existingToken) {
      await this.refreshTokenRepo.remove(existingToken);
    }
  }
}