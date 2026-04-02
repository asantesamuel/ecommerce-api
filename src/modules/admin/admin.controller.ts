import {
  Controller, Route, Tags, Get, Post,
  Path, Body, Query, Security, Request,
  Response, SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { AdminService }              from './admin.service';
import { ModerateProductDto, UpdateUserStatusDto } from './admin.dto';

@Route('admin')
@Tags('Admin')
@Security('jwt')
export class AdminController extends Controller {
  private service = new AdminService();

  /**
   * Get all users — admin only
   */
  @Get('users')
  @Response(403, 'Admins only')
  async getAllUsers(
    @Request() req:  ExpressRequest,
    @Query() page?:  number,
    @Query() limit?: number
  ): Promise<any> {
    return this.service.getAllUsers(req.user!, page, limit);
  }

  /**
   * Suspend or reactivate a user account — admin only
   */
  @Post('users/{userId}/status')
  @Response(403, 'Admins only')
  @Response(404, 'User not found')
  async updateUserStatus(
    @Path() userId:   string,
    @Request() req:   ExpressRequest,
    @Body() body:     UpdateUserStatusDto
  ): Promise<any> {
    return this.service.updateUserStatus(userId, body, req.user!);
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