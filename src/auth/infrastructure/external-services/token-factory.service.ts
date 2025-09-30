import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AccessPayload {
  sub: string;
  email: string;
  type: 'access';
}

interface RefreshPayload {
  jti: string;
  sub: string;
  type: 'refresh';
}

@Injectable()
export class TokenFactory {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async generateAccessToken(userId: string, email: string) {
    const payload: AccessPayload = { sub: userId, email, type: 'access' };
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('ACCESS_TOKEN_TTL', '900s'),
    });
  }

  async generateRefreshToken(tokenId: string, userId: string) {
    const payload: RefreshPayload = { jti: tokenId, sub: userId, type: 'refresh' };
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('REFRESH_TOKEN_TTL', '7d'),
    });
  }

  async verifyRefreshToken(rawToken: string): Promise<RefreshPayload> {
    return this.jwtService.verifyAsync<RefreshPayload>(rawToken, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
  }
}
