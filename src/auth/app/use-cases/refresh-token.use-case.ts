import { Injectable, Inject, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { TokenFactory } from "src/auth/infrastructure/external-services/token-factory.service";
import { RefreshTokenRepository } from "src/auth/infrastructure/repositories/refresh-token.repository";
import { FindUserByIdUseCase } from "src/users/app/use-cases/find-by-id.use-case";

@Injectable()
export class RefreshTokenUseCase {
    constructor(
        private findUserById: FindUserByIdUseCase,
        @Inject('IRefreshTokenRepository')
        private refreshRepo: RefreshTokenRepository,
        private tokens: TokenFactory,
    ) { }

    async execute(rawToken: string, ip?: string, userAgent?: string) {
        if (!rawToken) throw new BadRequestException('No refresh token provided');

        const payload = await this.tokens.verifyRefreshToken(rawToken).catch(() => {
            throw new UnauthorizedException('Invalid or expired refresh token');
        });

        const tokenRecord = await this.refreshRepo.findByIdAndUser(payload.jti, payload.sub);

        if (!tokenRecord || tokenRecord.revoked) {
            await this.refreshRepo.revokeAll(payload.sub);
            throw new UnauthorizedException('Possible refresh token reuse detected');
        }

        if (tokenRecord.expiresAt < new Date())
            throw new UnauthorizedException('Refresh expired');

        const user = await this.findUserById.execute(payload.sub);
        if (!user) throw new UnauthorizedException('User not found');

        // rotate
        await this.refreshRepo.revoke(tokenRecord);
        const newRecord = await this.refreshRepo.createToken(user.id, ip, userAgent);
        await this.refreshRepo.revoke(tokenRecord, newRecord.id);

        const [accessToken, refreshToken] = await Promise.all([
            this.tokens.generateAccessToken(user.id, user.email),
            this.tokens.generateRefreshToken(newRecord.id, user.id),
        ]);

        return { accessToken, refreshToken };
    }
}

