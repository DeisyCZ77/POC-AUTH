export class CleanupResponseDto {
  expiredRefreshTokens: number;
  revokedRefreshTokens: number;
  totalCleaned: number;
  timestamp: Date;
}

export class TokenStatsDto {
  refreshTokens: {
    total: number;
    active: number;
    revoked: number;
    expired: number;
    obsolete: number;
  };
  blacklistedTokens: {
    total: number;
    expired: number;
  };
}