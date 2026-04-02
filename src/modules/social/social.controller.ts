import {
  Controller, Route, Tags, Get, Post, Put,
  Path, Body, Security, Request,
  SuccessResponse, Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { SocialService }             from './social.service';
import {
  SendFriendRequestDto,
  RespondFriendRequestDto,
  ShareCartDto,
  FriendResponseDto,
  SharedCartResponseDto,
} from './social.dto';

@Route('social')
@Tags('Social')
@Security('jwt')
export class SocialController extends Controller {
  private service = new SocialService();

  /**
   * Send a friend request to another user
   */
  @Post('friends/request')
  @SuccessResponse(201, 'Request sent')
  @Response(400, 'Cannot request yourself')
  @Response(409, 'Friendship already exists')
  async sendRequest(
    @Request() req: ExpressRequest,
    @Body() body: SendFriendRequestDto
  ): Promise<FriendResponseDto> {
    this.setStatus(201);
    return this.service.sendFriendRequest(body, req.user!);
  }

  /**
   * Accept, decline, or block a friend request
   */
  @Put('friends/{friendshipId}/respond')
  @Response(400, 'Invalid action for current status')
  @Response(403, 'Not your request to respond to')
  @Response(404, 'Friend request not found')
  async respond(
    @Path() friendshipId: string,
    @Request() req:       ExpressRequest,
    @Body() body:         RespondFriendRequestDto
  ): Promise<FriendResponseDto> {
    return this.service.respondToRequest(friendshipId, body, req.user!);
  }

  /**
   * Get all accepted friends
   */
  @Get('friends')
  async getFriends(
    @Request() req: ExpressRequest
  ): Promise<FriendResponseDto[]> {
    return this.service.getFriends(req.user!);
  }

  /**
   * Get all pending friend requests sent to you
   */
  @Get('friends/requests')
  async getPendingRequests(
    @Request() req: ExpressRequest
  ): Promise<FriendResponseDto[]> {
    return this.service.getPendingRequests(req.user!);
  }

  /**
   * Share your cart with an accepted friend
   */
  @Post('cart/share')
  @SuccessResponse(201, 'Cart shared')
  @Response(400, 'Cart is empty')
  @Response(403, 'Not friends with this user')
  async shareCart(
    @Request() req: ExpressRequest,
    @Body() body: ShareCartDto
  ): Promise<SharedCartResponseDto> {
    this.setStatus(201);
    return this.service.shareCart(body, req.user!);
  }

  /**
   * View all carts that friends have shared with you
   */
  @Get('cart/shared-with-me')
  async getSharedCarts(
    @Request() req: ExpressRequest
  ): Promise<SharedCartResponseDto[]> {
    return this.service.getCartsSharedWithMe(req.user!);
  }
}