import { AppDataSource }                       from '../../config/database';
import { Product, ProductApprovalStatus }      from '../../entities/Product';
import { User, UserRole }                      from '../../entities/User';
import { Order, OrderStatus }                  from '../../entities/Order';
import { OrderItem }                           from '../../entities/OrderItem';
import { JwtPayload }                          from '../../utils/jwt';
import { AppError }                            from '../../utils/AppError';
import {
  ModerateProductDto,
  UpdateUserStatusDto,
  AdminUserListResponseDto,
  AnalyticsResponseDto,
  InventoryResponseDto,
} from './admin.dto';

export class AdminService {
  private productRepo  = AppDataSource.getRepository(Product);
  private userRepo     = AppDataSource.getRepository(User);
  private orderRepo    = AppDataSource.getRepository(Order);
  private orderItemRepo = AppDataSource.getRepository(OrderItem);

  private guardAdmin(currentUser: JwtPayload): void {
    if (currentUser.role !== 'admin') {
      throw AppError.forbidden('Admin access required');
    }
  }

  // ── GET /admin/users ───────────────────────────────────────────────────────
  async getAllUsers(
    currentUser: JwtPayload,
    page    = 1,
    limit   = 20,
    role?:   string,
    search?: string
  ): Promise<AdminUserListResponseDto> {
    this.guardAdmin(currentUser);

    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);

    const qb = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(Math.min(100, limit));

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(user.email) LIKE :search OR ' +
        'LOWER(user.firstName) LIKE :search OR ' +
        'LOWER(user.lastName) LIKE :search)',
        { search: `%${search.toLowerCase()}%` }
      );
    }

    const [data, total] = await qb.getManyAndCount();

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
      page:       Math.max(1, page),
      limit:      Math.min(100, limit),
      totalPages: Math.ceil(total / Math.min(100, limit)),
    };
  }

  // ── POST /admin/users/:id/status ──────────────────────────────────────────
  async updateUserStatus(
    userId:      string,
    dto:         UpdateUserStatusDto,
    currentUser: JwtPayload
  ): Promise<{ id: string; isActive: boolean; message: string }> {
    this.guardAdmin(currentUser);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw AppError.notFound('User');

    // Prevent admin from suspending themselves
    if (userId === currentUser.sub) {
      throw AppError.badRequest('You cannot change your own account status');
    }

    user.isActive = dto.isActive;
    await this.userRepo.save(user);

    return {
      id:       user.id,
      isActive: user.isActive,
      message:  dto.isActive
        ? 'User account reactivated successfully'
        : 'User account suspended successfully',
    };
  }

  // ── GET /admin/orders ─────────────────────────────────────────────────────
  async getAllOrders(
    currentUser: JwtPayload,
    page    = 1,
    limit   = 20,
    status?: string
  ): Promise<any> {
    this.guardAdmin(currentUser);

    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user',    'user')
      .leftJoinAndSelect('order.items',   'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('order.placedAt', 'DESC')
      .skip(skip)
      .take(Math.min(100, limit));

    if (status) {
      qb.where('order.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map(o => ({
        id:       o.id,
        status:   o.status,
        total:    Number(o.total),
        currency: o.currency,
        customer: o.user
          ? `${o.user.firstName} ${o.user.lastName}`
          : 'Deleted user',
        itemCount: o.items?.length || 0,
        placedAt:  o.placedAt,
      })),
      total,
      page:       Math.max(1, page),
      limit:      Math.min(100, limit),
      totalPages: Math.ceil(total / Math.min(100, limit)),
    };
  }

  // ── GET /admin/inventory ──────────────────────────────────────────────────
  async getLowStockAlerts(
    currentUser: JwtPayload,
    threshold = 10
  ): Promise<InventoryResponseDto> {
    this.guardAdmin(currentUser);

    const lowStock = await this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .where('product.stockQuantity <= :threshold', { threshold })
      .andWhere('product.isActive = true')
      .orderBy('product.stockQuantity', 'ASC')
      .getMany();

    const alerts = lowStock.map(p => ({
      productId:     p.id,
      productName:   p.name,
      slug:          p.slug,
      stockQuantity: p.stockQuantity,
      vendorName:    p.vendor?.businessName || 'Unknown vendor',
    }));

    return {
      alerts,
      totalAlerts: alerts.length,
      threshold,
    };
  }

  // ── GET /admin/analytics ──────────────────────────────────────────────────
  async getAnalytics(
    currentUser: JwtPayload
  ): Promise<AnalyticsResponseDto> {
    this.guardAdmin(currentUser);

    // Run all counts in parallel for performance
    const [
      totalUsers,
      totalVendors,
      totalProducts,
      totalOrders,
      ordersByStatus,
      revenueResult,
      recentOrders,
      topProducts,
    ] = await Promise.all([

      // Total users
      this.userRepo.count(),

      // Total approved vendors
      this.userRepo.count({ where: { role: UserRole.VENDOR } }),

      // Total active products
      this.productRepo.count({ where: { isActive: true } }),

      // Total orders
      this.orderRepo.count(),

      // Orders grouped by status
      this.orderRepo
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('order.status')
        .getRawMany(),

      // Total revenue from paid orders
      this.orderRepo
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.status IN (:...statuses)', {
          statuses: [OrderStatus.PAID, OrderStatus.DELIVERED],
        })
        .getRawOne(),

      // 5 most recent orders
      this.orderRepo.find({
        relations: ['user'],
        order:     { placedAt: 'DESC' },
        take:      5,
      }),

      // Top 5 best-selling products by quantity
      this.orderItemRepo
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.product', 'product')
        .select('product.id',             'productId')
        .addSelect('product.name',        'productName')
        .addSelect('SUM(item.quantity)',   'totalSold')
        .addSelect('SUM(item.unitPrice * item.quantity)', 'revenue')
        .groupBy('product.id')
        .addGroupBy('product.name')
        .orderBy('totalSold', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    // Build status counts map
    const statusCounts: Record<string, number> = {
      pending: 0, paid: 0, processing: 0, shipped: 0,
      delivered: 0, refunded: 0, cancelled: 0, failed: 0,
    };
    ordersByStatus.forEach((row: any) => {
      statusCounts[row.status] = parseInt(row.count);
    });

    return {
      overview: {
        totalUsers,
        totalVendors,
        totalProducts,
        totalOrders,
        totalRevenue: Math.round(Number(revenueResult?.total || 0) * 100) / 100,
      },
      orders: {
        pending:    statusCounts.pending,
        paid:       statusCounts.paid,
        processing: statusCounts.processing,
        shipped:    statusCounts.shipped,
        delivered:  statusCounts.delivered,
        refunded:   statusCounts.refunded,
        cancelled:  statusCounts.cancelled,
        failed:     statusCounts.failed,
      },
      recentOrders: recentOrders.map(o => ({
        id:       o.id,
        status:   o.status,
        total:    Number(o.total),
        customer: o.user
          ? `${o.user.firstName} ${o.user.lastName}`
          : 'Deleted user',
        placedAt: o.placedAt,
      })),
      topProducts: topProducts.map((p: any) => ({
        productId:   p.productId,
        productName: p.productName,
        totalSold:   parseInt(p.totalSold),
        revenue:     Math.round(Number(p.revenue) * 100) / 100,
      })),
    };
  }

  // ── POST /admin/products/:id/moderate ────────────────────────────────────
  async moderateProduct(
    productId:   string,
    dto:         ModerateProductDto,
    currentUser: JwtPayload
  ): Promise<{ id: string; approvalStatus: string; message: string }> {
    this.guardAdmin(currentUser);

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw AppError.notFound('Product');

    if (dto.action !== 'approve' && !dto.reason) {
      throw AppError.badRequest(
        'A reason is required when rejecting or flagging a product'
      );
    }

    const statusMap: Record<string, ProductApprovalStatus> = {
      approve: ProductApprovalStatus.APPROVED,
      reject:  ProductApprovalStatus.REJECTED,
      flag:    ProductApprovalStatus.FLAGGED,
    };

    product.approvalStatus = statusMap[dto.action];
    if (dto.action !== 'approve') {
      product.isActive = false;
    } else {
      product.isActive = true;
    }

    await this.productRepo.save(product);

    return {
      id:             product.id,
      approvalStatus: product.approvalStatus,
      message:        `Product ${dto.action}d successfully`,
    };
  }
}