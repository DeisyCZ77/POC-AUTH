import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from '../auth.service';

@Injectable()
export class TokenCleanupTask {
  private readonly logger = new Logger(TokenCleanupTask.name);

  constructor(private authService: AuthService) {}

  /**
   * Limpieza ligera: Ejecutar cada hora
   * Solo elimina tokens que definitivamente expiraron
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyCleanup() {
    this.logger.log('🧹 Starting hourly token cleanup...');
    
    try {
      const expired = await this.authService.cleanupExpiredRefreshTokens();
      
      this.logger.log(
        `✅ Hourly cleanup completed: ${expired} refresh tokens`,
      );
    } catch (error) {
      this.logger.error('❌ Hourly cleanup failed:', error);
    }
  }

  /**
   * Limpieza profunda: Ejecutar cada día a las 3:00 AM
   * Elimina tokens revocados y expirados
   */
  @Cron('0 3 * * *') // 3:00 AM todos los días
  async handleDailyCleanup() {
    this.logger.log('🧹 Starting daily deep token cleanup...');
    
    try {
      const result = await this.authService.cleanupAllObsoleteTokens();
      
      this.logger.log(
        `✅ Daily cleanup completed:
        - Expired refresh tokens: ${result.expiredRefreshTokens}
        - Revoked refresh tokens: ${result.revokedRefreshTokens}
        - Total cleaned: ${result.totalCleaned}`,
      );
    } catch (error) {
      this.logger.error('❌ Daily cleanup failed:', error);
    }
  }
}