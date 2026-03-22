import {
  Controller,
  Route,
  Tags,
  Post,
  Body,
  SuccessResponse,
  Response,
} from 'tsoa';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  MessageResponseDto,
} from './auth.dto';

@Route('auth')
@Tags('Auth')
export class AuthController extends Controller {
  private authService = new AuthService();

  /**
   * Register a new customer account
   */
  @Post('register')
  @SuccessResponse(201, 'Created')
  @Response(409, 'Email already registered')
  async register(@Body() body: RegisterDto): Promise<AuthResponseDto> {
    this.setStatus(201);
    return this.authService.register(body);
  }

  /**
   * Log in with email and password
   */
  @Post('login')
  @SuccessResponse(200, 'OK')
  @Response(401, 'Invalid credentials')
  async login(@Body() body: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(body);
  }

  /**
   * Get a new access token using a refresh token
   */
  @Post('refresh')
  @SuccessResponse(200, 'OK')
  @Response(401, 'Invalid or expired refresh token')
  async refresh(
    @Body() body: RefreshTokenDto
  ): Promise<{ accessToken: string }> {
    return this.authService.refresh(body);
  }
}