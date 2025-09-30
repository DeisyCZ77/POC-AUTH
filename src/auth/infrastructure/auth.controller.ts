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
  NotFoundException,
  Delete,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { LoginDto } from '../app/dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { LoginUseCase } from '../app/use-cases/login.use-case';
import { LogoutUseCase } from '../app/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../app/use-cases/refresh-token.use-case';
import { ConfigService } from '@nestjs/config';
import { getRefreshTtlMs } from '../../helpers/token-ttl.util';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { GetUserActiveSessionsUseCase } from '../app/use-cases/get-user-active-sessions.use-case';
import { RevokeTokenByIdUseCase } from '../app/use-cases/revoke-token-by-id.use-case';
import { RevokeAllUserTokensUseCase } from '../app/use-cases/revoke-all-user-tokens.use-case copy';
import { CleanupExpiredTokensUseCase } from '../app/use-cases/cleanup-tokens.use-case';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {

  private expiresIn: string | number;

  constructor(
    private config: ConfigService,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getUserActiveSessions: GetUserActiveSessionsUseCase,
    private readonly revokeTokenById: RevokeTokenByIdUseCase,
    private readonly revokeAllUserTokens: RevokeAllUserTokensUseCase,
    private readonly cleanupExpiredTokens: CleanupExpiredTokensUseCase,
  ) {
    this.expiresIn = this.config.get<string>('ACCESS_TOKEN_TTL') || '900';
  }

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

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
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

    this.setRefreshTokenCookie(res, newRefreshToken);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    console.log('🔍 Logout - Token recibido:', refreshToken ? 'SÍ' : 'NO');
    console.log('🔍 Logout - Token length:', refreshToken?.length);

    await this.logoutUseCase.execute(refreshToken);

    res.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  // ✅ Endpoints adicionales útiles

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@Req() req: Request) {
    const userId = (req as any).user.sub;
    const sessions = await this.getUserActiveSessions.execute(userId);

    return {
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        expiresAt: s.expiresAt,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  async revokeSession(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = (req as any).user.sub;

    const revoked = await this.revokeTokenById.execute(sessionId, userId);
    if (!revoked) throw new NotFoundException('Session not found');

    return { message: 'Session revoked successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = (req as any).user.sub;
    await this.revokeAllUserTokens.execute(userId);

    res.clearCookie('refreshToken', {
      path: '/auth',
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
    });

    return { message: 'All sessions logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cleanup-expired-tokens')
  async deleteExpiredTokensc() {
    await this.cleanupExpiredTokens.execute();
    return { message: `Deleted expired tokens` };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: getRefreshTtlMs(this.config),
    });
  }
}