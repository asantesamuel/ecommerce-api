import { AppDataSource }                       from '../../config/database';
import { Product, ProductApprovalStatus }      from '../../entities/Product';
import { User }                                from '../../entities/User';
import { JwtPayload }                          from '../../utils/jwt';
import { ModerateProductDto, UpdateUserStatusDto } from './admin.dto';

export class AdminService {
  private productRepo = AppDataSource.getRepository(Product);
  private userRepo    = AppDataSource.getRepository(User);

  private guardAdmin(currentUser: JwtPayload): void {
    if (currentUser.role !== 'admin') {
      const error: any = new Error('Admin access required');
      error.status = 403;
      throw error;
    }
  }

  // ── Product moderation ─────────────────────────────────────────────────────
  async moderateProduct(
    productId:   string,
    dto:         ModerateProductDto,
    currentUser: JwtPayload
  ): Promise<{ id: string; approvalStatus: string }> {
    this.guardAdmin(currentUser);

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) {
      const error: any = new Error('Product not found');
      error.status = 404;
      throw error;
    }

    const statusMap: Record<string, ProductApprovalStatus> = {
      approve: ProductApprovalStatus.APPROVED,
      reject:  ProductApprovalStatus.REJECTED,
      flag:    ProductApprovalStatus.FLAGGED,
    };

    product.approvalStatus = statusMap[dto.action];

    // If rejected or flagged, hide from public catalogue
    if (dto.action !== 'approve') {
      product.isActive = false;
    }

    await this.productRepo.save(product);

    return { id: product.id, approvalStatus: product.approvalStatus };
  }

  // ── User management ────────────────────────────────────────────────────────
  async updateUserStatus(
    userId:      string,
    dto:         UpdateUserStatusDto,
    currentUser: JwtPayload
  ): Promise<{ id: string; isActive: boolean }> {
    this.guardAdmin(currentUser);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    user.isActive = dto.isActive;
    await this.userRepo.save(user);

    return { id: user.id, isActive: user.isActive };
  }

  // ── List all users ─────────────────────────────────────────────────────────
  async getAllUsers(
    currentUser: JwtPayload,
    page  = 1,
    limit = 20
  ): Promise<{ data: any[]; total: number }> {
    this.guardAdmin(currentUser);

    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
    const [data, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take:  Math.min(100, limit),
    });

    return {
      data: data.map(u => ({
        id:        u.id,
        email:     u.email,
        firstName: u.firstName,
        lastName:  u.lastName,
        role:      u.role,
        isActive:  u.isActive,
        createdAt: u.createdAt,
      })),
      total,
    };
  }
}