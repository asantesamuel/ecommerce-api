import {
  Body,
  Controller,
  Get,
  Put,
  Request,
  Response,
  Route,
  Security,
  Tags,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import {
  UpdateMyProfileDto,
  UserProfileResponseDto,
} from './users.dto';

@Route('users')
@Tags('Users')
export class UsersController extends Controller {
  private service = new UsersService();

  @Get('me')
  @Security('jwt')
  @Response(404, 'User not found')
  async getMe(
    @Request() req: ExpressRequest
  ): Promise<UserProfileResponseDto> {
    return this.service.getMe(req.user!);
  }

  @Put('me')
  @Security('jwt')
  @Response(404, 'User not found')
  async updateMe(
    @Request() req: ExpressRequest,
    @Body() body: UpdateMyProfileDto
  ): Promise<UserProfileResponseDto> {
    return this.service.updateMe(body, req.user!);
  }
}
