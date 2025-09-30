import { Injectable, Inject } from "@nestjs/common";
import { TokenFactory } from "src/auth/infrastructure/external-services/token-factory.service";
import { RefreshTokenRepository } from "src/auth/infrastructure/repositories/refresh-token.repository";

@Injectable()

export class LogoutUseCase {
    constructor(
       @Inject('IRefreshTokenRepository')
        private refreshRepo: RefreshTokenRepository,
        private tokens: TokenFactory,
    ) { }

    async execute(rawToken: string) {
        if (!rawToken) {
    console.log('❌ Logout - No token provided');
    return;
  }
        const payload = await this.tokens.verifyRefreshToken(rawToken).catch(() => null);
        if (!payload) return;

        const tokenRecord = await this.refreshRepo.findByIdAndUser(payload.jti, payload.sub);
        if (tokenRecord && !tokenRecord.revoked) {
            await this.refreshRepo.revoke(tokenRecord);
        }
    }
}