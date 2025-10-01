import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  Get,
  UnauthorizedException,
  Delete,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Request() req,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const result = await this.authService.login(
      user,
      req.headers['user-agent'],
      req.ip,
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.refreshTokens(
      req.user.userId,
      req.user.refreshToken,
      req.headers['user-agent'],
      req.ip,
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Request() req,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    await this.authService.logoutAll(req.user.id);
    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out from all devices' };
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  private setRefreshTokenCookie(res: ExpressResponse, token: string) {
    const isProduction = this.config.get('NODE_ENV') === 'production';
    
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  // Limpiar solo refresh tokens expirados
   
  @Delete('cleanup/refresh-tokens/expired')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredRefreshTokens() {
    const deleted = await this.authService.cleanupExpiredRefreshTokens();
    
    return {
      message: 'Expired refresh tokens cleaned',
      deleted,
      timestamp: new Date(),
    };
  }
  
  // limpiar todos los tokens obsoletos (revocados y expirados)
  @Delete('cleanup/tokens')
  @HttpCode(HttpStatus.OK)
  async cleanupRevokedTokens() {
    const result = await this.authService.cleanupAllObsoleteTokens();
    
   return {
      message: 'Token cleanup completed successfully',
      stats: result,
      timestamp: new Date(),
    };
  }


  private clearRefreshTokenCookie(res: ExpressResponse) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}