import { Injectable, Inject } from "@nestjs/common";
import { RefreshTokenRepository } from "src/auth/infrastructure/repositories/refresh-token.repository";

@Injectable()
export class RevokeAllUserTokens {
    constructor(
        @Inject('IRefreshTokenRepository')
        private refreshRepo: RefreshTokenRepository
    ) { }

    async execute(userId: string) {
        return this.refreshRepo.revokeAll(userId);
    }
}