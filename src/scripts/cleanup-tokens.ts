import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';

async function cleanupTokens() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  console.log('🧹 Starting token cleanup...\n');

  const result = await authService.cleanupAllObsoleteTokens();
  console.log('\n✅ Cleanup completed:', JSON.stringify(result, null, 2));

  await app.close();
}

cleanupTokens().catch(console.error);