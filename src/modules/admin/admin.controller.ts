import {
  Controller, Route, Tags, Get, Post,
  Path, Body, Query, Security, Request,
  Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { AdminService }              from './admin.service';
import {
  ModerateProductDto,
  UpdateUserStatusDto,
  AdminUserListResponseDto,
  AnalyticsResponseDto,
  InventoryResponseDto,
} from './admin.dto';

@Route('admin')
@Tags('Admin')
@Security('jwt')
export class AdminController extends Controller {
  private service = new AdminService();

  /**
   * Get all users with optional role and search filters — admin only
   */
  @Get('users')
  @Response(403, 'Admins only')
  async getAllUsers(
    @Request() req:   ExpressRequest,
    @Query() page?:   number,
    @Query() limit?:  number,
    @Query() role?:   string,
    @Query() search?: string
  ): Promise<AdminUserListResponseDto> {
    return this.service.getAllUsers(req.user!, page, limit, role, search);
  }

  /**
   * Suspend or reactivate a user account — admin only
   */
  @Post('users/{userId}/status')
  @Response(403, 'Admins only')
  @Response(404, 'User not found')
  async updateUserStatus(
    @Path() userId:  string,
    @Request() req:  ExpressRequest,
    @Body() body:    UpdateUserStatusDto
  ): Promise<any> {
    return this.service.updateUserStatus(userId, body, req.user!);
  }

  /**
   * Get all orders platform-wide — admin only
   */
  @Get('orders')
  @Response(403, 'Admins only')
  async getAllOrders(
    @Request() req:    ExpressRequest,
    @Query() page?:    number,
    @Query() limit?:   number,
    @Query() status?:  string
  ): Promise<any> {
    return this.service.getAllOrders(req.user!, page, limit, status);
  }

  /**
   * Get low stock alerts — products at or below the threshold — admin only
   */
  @Get('inventory/low-stock')
  @Response(403, 'Admins only')
  async getLowStockAlerts(
    @Request() req:        ExpressRequest,
    @Query() threshold?:   number
  ): Promise<InventoryResponseDto> {
    return this.service.getLowStockAlerts(req.user!, threshold);
  }

  /**
   * Get platform analytics — admin only
   */
  @Get('analytics')
  @Response(403, 'Admins only')
  async getAnalytics(
    @Request() req: ExpressRequest
  ): Promise<AnalyticsResponseDto> {
    return this.service.getAnalytics(req.user!);
  }

  /**
   * Get products pending review — admin only
   */
  @Get('products/pending')
  @Response(403, 'Admins only')
  async getPendingProducts(
    @Request() req: ExpressRequest,
    @Query() page?: number,
    @Query() limit?: number
  ): Promise<any> {
    return this.service.getPendingProducts(req.user!, page, limit);
  }

  /**
   * Approve, reject, or flag a product listing — admin only
   */
  @Post('products/{productId}/moderate')
  @Response(403, 'Admins only')
  @Response(404, 'Product not found')
  async moderateProduct(
    @Path() productId: string,
    @Request() req:    ExpressRequest,
    @Body() body:      ModerateProductDto
  ): Promise<any> {
    return this.service.moderateProduct(productId, body, req.user!);
  }
}
