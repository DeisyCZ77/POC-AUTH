import { Inject, Injectable } from "@nestjs/common";
import { RefreshTokenRepository } from "src/auth/infrastructure/repositories/refresh-token.repository";

@Injectable()
export class CleanupTokensUseCase {
    constructor(
        @Inject('IRefreshTokenRepository')
        private refreshRepo: RefreshTokenRepository
    ) { }

    async execute() {
        return this.refreshRepo.cleanupExpired();
    }
}