import { Inject, Injectable } from "@nestjs/common";
import { RefreshTokenRepository } from "src/auth/infrastructure/repositories/refresh-token.repository";

@Injectable()
export class GetUserActiveSessionsUseCase {
    constructor(
        @Inject('IRefreshTokenRepository')
        private refreshRepo: RefreshTokenRepository
    ) { }

    async execute(userId: string): Promise<any[]> {
        return this.refreshRepo.getUserActiveSessions(userId);
    }
}