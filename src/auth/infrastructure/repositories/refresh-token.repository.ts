import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';
import { IRefreshTokenRepository } from 'src/auth/domain/refresh-token.interface.repository';
import { getRefreshTtlMs } from '../../../helpers/token-ttl.util';

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
    constructor(
        @InjectRepository(RefreshTokenEntity)
        private repo: Repository<RefreshTokenEntity>,
        private config: ConfigService,
    ) { }

    createToken(userId: string, ip?: string, userAgent?: string) {
        const ttlMs = getRefreshTtlMs(this.config);

        const token = this.repo.create({
            userId,
            expiresAt: new Date(Date.now() + ttlMs),
            revoked: false,
            ipAddress: ip,
            userAgent,
        });
        return this.repo.save(token);
    }

    async findByIdAndUser(id: string, userId: string) {
        return this.repo.findOne({ where: { id, userId } });
    }

    async revoke(token: RefreshTokenEntity, replacedBy?: string) {
        token.revoked = true;
        token.lastUsedAt = new Date();
        if (replacedBy) token.replacedBy = replacedBy;
        return this.repo.save(token);
    }

    async cleanupExpired() {
        return this.repo.createQueryBuilder()
            .delete()
            .where('expiresAt < :now', { now: new Date() })
            .orWhere('revoked = true AND lastUsedAt < :threshold', {
                threshold: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            })
            .execute();
    }

    getUserActiveSessions(userId: string) {
        return this.repo.find({
            where: { userId, revoked: false },
            order: { createdAt: 'DESC' },
        });
    }

    async revokeAll(userId: string) {
        return this.repo.update({ userId, revoked: false }, { revoked: true });
    }


}
