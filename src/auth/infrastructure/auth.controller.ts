import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  UseGuards,
  HttpCode,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from '../app/dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { LoginUseCase } from '../app/use-cases/login.use-case';
import { LogoutUseCase } from '../app/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../app/use-cases/refresh-token.use-case';
import { ConfigService } from '@nestjs/config';
import { getRefreshTtlMs } from '../../helpers/token-ttl.util';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  constructor(
    private config: ConfigService,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) { }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.loginUseCase.execute(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );

    // ✅ Configurar cookie HttpOnly
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutos
    };
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) throw new UnauthorizedException('No refresh token provided');

    const { accessToken, refreshToken: newRefreshToken } =
      await this.refreshUseCase.execute(
        refreshToken,
        req.ip,
        req.headers['user-agent'],
      );

    // ✅ Actualizar cookie con nuevo token
    this.setRefreshTokenCookie(res, newRefreshToken);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    await this.logoutUseCase.execute(refreshToken);

    // ✅ Limpiar cookie
    res.clearCookie('refreshToken', {
      path: '/auth',
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return { user: (req as any).user };
  }

  // ✅ Helper privado para configurar cookie
  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/auth',
      maxAge: getRefreshTtlMs(this.config),
    });
  }
}