import { join } from 'path';
import { readFileSync } from 'fs';
import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuditSubscriber } from '../subscribers/audit.subscriber';

function buildSslConfig():
  | false
  | { rejectUnauthorized: boolean; ca?: string } {
  if (process.env.DATABASE_SSL !== 'true') {
    return false;
  }

  const caPath = process.env.DATABASE_SSL_CA;
  return {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}),
  };
}

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'todolist',
    autoLoadEntities: true,
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
    migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
    migrationsRun: true,
    subscribers: [AuditSubscriber],
    ssl: buildSslConfig(),
  }),
);
