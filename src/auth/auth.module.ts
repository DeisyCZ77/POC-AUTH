import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './infrastructure/auth.controller';
import { RefreshTokenEntity } from './infrastructure/entities/refresh-token.entity';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { LoginUseCase } from './app/use-cases/login.use-case';
import { CleanupTokensUseCase } from './app/use-cases/cleanup-tokens.use-case';
import { RevokeAllUserTokens } from './app/use-cases/revoke-tokens.use-case';
import { RefreshTokenUseCase } from './app/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './app/use-cases/logout.use-case';
import { RefreshTokenRepository } from './infrastructure/repositories/refresh-token.repository';
import { TokenFactory } from './infrastructure/external-services/token-factory.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
  imports: [
    RefreshTokenEntity,
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_secret',
        signOptions: { expiresIn: '1h' },
      }),
    }),
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    UsersModule,
  ],
  providers: [
    {
      provide: 'IRefreshTokenRepository',
      useClass: RefreshTokenRepository,
    },

    JwtStrategy,
    JwtAuthGuard,
    ConfigService,
    TokenFactory,

    // Use Cases
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    CleanupTokensUseCase,
    RevokeAllUserTokens,
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard],
})
export class AuthModule { }