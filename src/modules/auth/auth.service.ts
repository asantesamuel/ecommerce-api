// TODO: implement auth service logic
import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../entities/User';
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
} from './auth.dto';

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email is already taken
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      const error: any = new Error('Email is already registered');
      error.status = 409;
      throw error;
    }

    // Hash password and save user
    const passwordHash = await hashPassword(dto.password);
    const user = this.userRepo.create({
      email:        dto.email,
      passwordHash,
      firstName:    dto.firstName,
      lastName:     dto.lastName,
      role:         UserRole.CUSTOMER,
    });
    await this.userRepo.save(user);

    // Issue tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken:  signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Fetch user and explicitly select passwordHash (excluded by default)
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    if (!user.isActive) {
      const error: any = new Error('Your account has been suspended');
      error.status = 403;
      throw error;
    }

    const passwordValid = await comparePassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      const error: any = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken:  signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id:        user.id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
      },
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string }> {
    let payload: any;
    try {
      payload = verifyRefreshToken(dto.refreshToken);
    } catch {
      const error: any = new Error('Invalid or expired refresh token');
      error.status = 401;
      throw error;
    }

    // Confirm user still exists and is active
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      const error: any = new Error('User not found or suspended');
      error.status = 401;
      throw error;
    }

    return {
      accessToken: signAccessToken({
        sub:   user.id,
        email: user.email,
        role:  user.role,
      }),
    };
  }
}