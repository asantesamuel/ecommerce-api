import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { JwtPayload } from '../../utils/jwt';
import {
  UpdateMyProfileDto,
  UserProfileResponseDto,
} from './users.dto';

export class UsersService {
  private userRepo = AppDataSource.getRepository(User);

  private format(user: User): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl || null,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getMe(currentUser: JwtPayload): Promise<UserProfileResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    return this.format(user);
  }

  async updateMe(
    dto: UpdateMyProfileDto,
    currentUser: JwtPayload
  ): Promise<UserProfileResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl || null!;
    }

    await this.userRepo.save(user);
    return this.format(user);
  }
}
