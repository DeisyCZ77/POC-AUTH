import { RefreshTokenEntity } from "../infrastructure/entities/refresh-token.entity";

export interface IRefreshTokenRepository{
    createToken(userId: string, ip?: string, userAgent?: string): Promise<RefreshTokenEntity>;
    findByIdAndUser(id: string, userId: string): Promise<RefreshTokenEntity | null>;
    revoke(token: RefreshTokenEntity, replacedBy?: string): Promise<RefreshTokenEntity>;
    cleanupExpired();
    getUserActiveSessions(userId: string): Promise<RefreshTokenEntity[]>;
    revokeAll(userId: string);
}