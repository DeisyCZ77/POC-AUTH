import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export const getOrmConfig = (configService: ConfigService): DataSourceOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: parseInt(configService.get<string>('DB_PORT', '5432'), 10) || 5432,
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  synchronize: true,
});
