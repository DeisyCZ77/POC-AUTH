// // src/auth/auth-cleanup.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { AuthService } from './auth.service';

// @Injectable()
// export class AuthCleanupService {
//   private readonly logger = new Logger(AuthCleanupService.name);

//   constructor(private authService: AuthService) {}

//   @Cron(CronExpression.EVERY_DAY_AT_3AM)
//   async handleCleanup() {
//     this.logger.log('Starting refresh tokens cleanup...');
//     const deleted = await this.authService.cleanupExpiredTokens();
//     this.logger.log(`Cleanup completed. Deleted ${deleted} expired tokens.`);
//   }
// }