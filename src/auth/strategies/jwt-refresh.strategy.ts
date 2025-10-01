// src/auth/strategies/jwt-refresh.strategy.ts
import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private config: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const token = req?.cookies?.['refresh_token'];
        if (!token) {
          return null;
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') || 'default_refresh',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies?.['refresh_token'];
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokenDoc = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken, revoked: false },
      relations: ['user'],
    });

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > tokenDoc.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return { userId: payload.sub, refreshToken };
  }
}