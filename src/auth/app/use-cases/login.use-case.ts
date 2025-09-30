import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { RefreshTokenRepository } from "src/auth/infrastructure/repositories/refresh-token.repository";
import { TokenFactory } from "src/auth/infrastructure/external-services/token-factory.service";
import { FindUserByEmailUseCase } from "src/users/app/use-cases/find-by-email.use-case";
import * as bcrypt from 'bcrypt';
import { User } from "src/users/domain/user.model";

@Injectable()
export class LoginUseCase {
    constructor(
        private readonly findUserByEmail: FindUserByEmailUseCase,
       @Inject('IRefreshTokenRepository')
        private refreshRepo: RefreshTokenRepository,
        private tokens: TokenFactory,
    ) { }

    async execute(email: string, password: string, ip?: string, userAgent?: string) {
        const user = await this.findUserByEmail.execute(email);
        if (!user || !(await this.verifyPassword(user, password)))
            throw new UnauthorizedException('Credenciales inválidas');

        const tokenRecord = await this.refreshRepo.createToken(user.id, ip, userAgent);

        const [accessToken, refreshToken] = await Promise.all([
            this.tokens.generateAccessToken(user.id, user.email),
            this.tokens.generateRefreshToken(tokenRecord.id, user.id),
        ]);

        return { accessToken, refreshToken, refreshTokenId: tokenRecord.id };
    }

    private verifyPassword(user: User, plainPassword: string): Promise<boolean> {
        if (!user || !user.password) return Promise.resolve(false);
        return bcrypt.compare(plainPassword, user.password);
    }
}
