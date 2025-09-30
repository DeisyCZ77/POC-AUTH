import { Injectable, Inject } from "@nestjs/common";
import { RefreshTokenRepository } from "src/auth/infrastructure/repositories/refresh-token.repository";

@Injectable()
export class RevokeTokenByIdUseCase {
    constructor(
        @Inject('IRefreshTokenRepository')
        private refreshRepo: RefreshTokenRepository
    ) { }

    async execute(tokenId: string, userId: string) {
        return this.refreshRepo.revokeTokenById(tokenId, userId);
    }
}