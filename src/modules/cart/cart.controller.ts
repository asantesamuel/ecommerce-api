import {
  Controller, Route, Tags, Get, Post, Put, Delete,
  Path, Body, Security, Request, SuccessResponse, Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { CartService } from './cart.service';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  CartResponseDto,
} from './cart.dto';

@Route('cart')
@Tags('Cart')
@Security('jwt')
export class CartController extends Controller {
  private service = new CartService();

  /**
   * Get the current user's cart.
   * Creates an empty cart automatically if none exists.
   */
  @Get()
  async getCart(@Request() req: ExpressRequest): Promise<CartResponseDto> {
    return this.service.getCart(req.user!);
  }

  /**
   * Add a product to the cart.
   * If the product is already in the cart the quantities are merged.
   * The price is snapshotted at the time of adding.
   */
  @Post('items')
  @SuccessResponse(201, 'Item added')
  @Response(400, 'Insufficient stock')
  @Response(404, 'Product not found')
  async addItem(
    @Request() req: ExpressRequest,
    @Body() body: AddCartItemDto
  ): Promise<CartResponseDto> {
    this.setStatus(201);
    return this.service.addItem(body, req.user!);
  }

  /**
   * Update the quantity of a specific cart item
   */
  @Put('items/{itemId}')
  @Response(400, 'Insufficient stock')
  @Response(404, 'Cart item not found')
  async updateItem(
    @Path() itemId: string,
    @Request() req: ExpressRequest,
    @Body() body: UpdateCartItemDto
  ): Promise<CartResponseDto> {
    return this.service.updateItem(itemId, body, req.user!);
  }

  /**
   * Remove a specific item from the cart
   */
  @Delete('items/{itemId}')
  @Response(404, 'Cart item not found')
  async removeItem(
    @Path() itemId: string,
    @Request() req: ExpressRequest
  ): Promise<CartResponseDto> {
    return this.service.removeItem(itemId, req.user!);
  }

  /**
   * Remove all items from the cart
   */
  @Delete()
  @SuccessResponse(200, 'Cart cleared')
  async clearCart(@Request() req: ExpressRequest): Promise<CartResponseDto> {
    return this.service.clearCart(req.user!);
  }
}