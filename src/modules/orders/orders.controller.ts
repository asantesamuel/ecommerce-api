import {
  Controller, Route, Tags, Get, Post,
  Path, Body, Query, Security, Request,
  SuccessResponse, Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { OrdersService }             from './orders.service';
import {
  CheckoutDto,
  OrderResponseDto,
  OrderListResponseDto,
  RefundDto,
} from './orders.dto';

@Route('orders')
@Tags('Orders')
@Security('jwt')
export class OrdersController extends Controller {
  private service = new OrdersService();

  /**
   * Checkout — validates cart, creates order, initializes Paystack payment.
   * Returns the order with a paymentUrl — redirect the customer there to pay.
   */
  @Post('checkout')
  @SuccessResponse(201, 'Order created')
  @Response(400, 'Cart is empty or stock issue')
  @Response(502, 'Payment initialization failed')
  async checkout(
    @Request() req: ExpressRequest,
    @Body() body: CheckoutDto
  ): Promise<OrderResponseDto> {
    this.setStatus(201);
    return this.service.checkout(body, req.user!);
  }

  /**
   * Get the authenticated user's order history
   */
  @Get()
  async getMyOrders(
    @Request() req: ExpressRequest,
    @Query() page?:  number,
    @Query() limit?: number
  ): Promise<OrderListResponseDto> {
    return this.service.findUserOrders(req.user!, page, limit);
  }

  /**
   * Get the authenticated vendor's order history
   * Retrieves orders that contain products created by the vendor
   */
  @Get('vendor/my-orders')
  @Response(403, 'Vendors only')
  async getVendorOrders(
    @Request() req: ExpressRequest,
    @Query() page?:  number,
    @Query() limit?: number
  ): Promise<OrderListResponseDto> {
    return this.service.findVendorOrders(req.user!, page, limit);
  }

  /**
   * Get a single order by ID.
   * Customers can only view their own orders.
   * Admins can view any order.
   */
  @Get('{id}')
  @Response(403, 'Access denied')
  @Response(404, 'Order not found')
  async getOne(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<OrderResponseDto> {
    return this.service.findOne(id, req.user!);
  }

  /**
   * Admin: get all orders platform-wide with optional status filter
   */
  @Get('admin/all')
  @Response(403, 'Admins only')
  async getAllOrders(
    @Request() req: ExpressRequest,
    @Query() page?:   number,
    @Query() limit?:  number,
    @Query() status?: string
  ): Promise<OrderListResponseDto> {
    return this.service.findAllOrders(page, limit, status);
  }

  /**
   * Admin: issue a full or partial refund for a paid order
   */
  @Post('refund')
  @Response(400, 'Invalid refund request')
  @Response(403, 'Admins only')
  @Response(404, 'Order not found')
  async refund(
    @Request() req: ExpressRequest,
    @Body() body: RefundDto
  ): Promise<{ message: string }> {
    return this.service.refund(body, req.user!);
  }
}