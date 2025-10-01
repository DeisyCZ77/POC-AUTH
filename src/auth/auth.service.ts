// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: ['user'],
    });

    await this.userRepo.save(user);

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: User, userAgent?: string, ipAddress?: string) {
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(userId: string, oldRefreshToken: string, userAgent?: string, ipAddress?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke old refresh token
    await this.revokeRefreshToken(oldRefreshToken);

    // Generate new tokens
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string) {
    await this.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string) {
    await this.refreshTokenRepo.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
  }

  // Limpia todos los refresh tokens expirados
  async cleanupExpiredRefreshTokens(): Promise<number> {
    const result = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  // Limpia todos los refresh tokens revocados que ya expiraron
   
  async cleanupRevokedRefreshTokens(): Promise<number> {
    const result = await this.refreshTokenRepo.delete({
      revoked: true,
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  // Limpia todos los refresh tokens revocados y expirados
  async cleanupAllObsoleteTokens() {
    const [
      expiredRefresh,
      revokedRefresh,
    ] = await Promise.all([
      this.cleanupExpiredRefreshTokens(),
      this.cleanupRevokedRefreshTokens(),
    ]);

    return {
      expiredRefreshTokens: expiredRefresh,
      revokedRefreshTokens: revokedRefresh,
      totalCleaned: expiredRefresh + revokedRefresh,
    };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '5m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default

    const refreshToken = this.refreshTokenRepo.create({
      token,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    });

    await this.refreshTokenRepo.save(refreshToken);

    // Clean up expired tokens
    await this.cleanupExpiredTokens(userId);
  }

  private async revokeRefreshToken(token: string) {
    await this.refreshTokenRepo.update(
      { token },
      { revoked: true, revokedAt: new Date() },
    );
  }

  private async cleanupExpiredTokens(userId: string) {
    await this.refreshTokenRepo.delete({
      userId,
      expiresAt: LessThan(new Date()),
    });

    // Keep only last 5 active tokens per user
    const tokens = await this.refreshTokenRepo.find({
      where: { userId, revoked: false },
      order: { createdAt: 'DESC' },
    });

    if (tokens.length > 5) {
      const tokensToRevoke = tokens.slice(5);
      await this.refreshTokenRepo.update(
        { id: In(tokensToRevoke.map((t) => t.id)) },
        { revoked: true, revokedAt: new Date() },
      );
    }
  }

  private sanitizeUser(user: User) {
    const { password, twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }
}

// Missing import
import { In } from 'typeorm';