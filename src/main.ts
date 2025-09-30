import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.use(helmet());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(3000);
  console.log('🚀 Server listening on http://localhost:3000');
  console.log('📝 Auth endpoints:');
  console.log('   POST /auth/login');
  console.log('   POST /auth/refresh');
  console.log('   POST /auth/logout');
  console.log('   POST /auth/logout-all');
  console.log('   POST /auth/revoke-all');
  console.log('   DELETE /auth/revoke/:id');

  console.log('   GET  /auth/me');
  console.log('   GET  /auth/sessions');
  console.log('   DELETE /auth/sessions/:sessionId');
}
bootstrap();
