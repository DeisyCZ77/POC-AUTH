import { ConfigService } from '@nestjs/config';

export function getRefreshTtlMs(config: ConfigService): number {
  const val = config.get<string>('REFRESH_TOKEN_TTL', '7d');

  if (val.endsWith('d')) return parseInt(val) * 24 * 60 * 60 * 1000;
  if (val.endsWith('h')) return parseInt(val) * 60 * 60 * 1000;

  return 7 * 24 * 60 * 60 * 1000;
}
