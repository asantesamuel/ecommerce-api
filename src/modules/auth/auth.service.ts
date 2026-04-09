import { AppDataSource } from '../../config/database';
import { LessThan } from 'typeorm';
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
import { redisClient } from '../../middlewares/rateLimiter';

const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_DURATION_SEC = 15 * 60; // 15 minutes

function getRateLimitKey(ip: string, email: string): string {
  return `failed_login:${ip}:${email}`;
}

async function checkRateLimit(ip: string, email: string): Promise<void> {
  const key = getRateLimitKey(ip, email);
  const countStr = await redisClient.get(key);
  if (countStr) {
    const count = parseInt(countStr, 10);
    if (count >= MAX_FAILED_ATTEMPTS) {
      const ttl = await redisClient.ttl(key);
      const minutesLeft = Math.max(1, Math.ceil(ttl / 60));
      const error: any = new Error(
        `Too many failed attempts. Try again in ${minutesLeft} minute(s).`
      );
      error.status = 429;
      throw error;
    }
  }
}

async function recordFailedAttempt(ip: string, email: string): Promise<void> {
  const key = getRateLimitKey(ip, email);
  await redisClient.incr(key);
  await redisClient.expire(key, BLOCK_DURATION_SEC);
}

async function clearFailedAttempts(ip: string, email: string): Promise<void> {
  const key = getRateLimitKey(ip, email);
  await redisClient.del(key);
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

  async login(dto: LoginDto, ip: string): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    await checkRateLimit(ip, email);

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      await recordFailedAttempt(ip, email);
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
      await recordFailedAttempt(ip, email);
      const error: any = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    await clearFailedAttempts(ip, email);

    // Cleanup expired tokens on login
    await this.refreshTokenRepo.delete({
      user: { id: user.id } as any,
      expiresAt: LessThan(new Date()),
    });

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

    // Cleanup expired tokens on refresh
    await this.refreshTokenRepo.delete({
      user: { id: user.id } as any,
      expiresAt: LessThan(new Date()),
    });

    // Save new token and remove old token inside a transaction
    await AppDataSource.transaction(async (manager) => {
      const newTokenEntity = manager.create(RefreshToken, {
        token: newRefreshToken,
        user,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await manager.save(newTokenEntity);
      await manager.remove(existingToken);
    });

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