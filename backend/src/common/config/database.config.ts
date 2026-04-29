import { join } from 'path';
import { readFileSync } from 'fs';
import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuditSubscriber } from '../subscribers/audit.subscriber';

function requireInProduction(key: string, fallback: string): string {
  if (process.env.NODE_ENV === 'production') {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
  return process.env[key] || fallback;
}

function buildSslConfig():
  | false
  | { rejectUnauthorized: boolean; ca?: string } {
  // WHY: Supabase 등 관리형 Postgres는 TLS 필수. env 토글 누락으로 prod 연결이
  // 실패하는 사고를 막기 위해 production 에서는 무조건 SSL 활성 + 검증을 강제한다.
  // (INFRA_SPEC.md §2.1, §8-③)
  if (process.env.NODE_ENV === 'production') {
    const caPath = process.env.DATABASE_SSL_CA;
    return {
      rejectUnauthorized: true,
      ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}),
    };
  }

  if (process.env.DATABASE_SSL !== 'true') {
    return false;
  }

  const caPath = process.env.DATABASE_SSL_CA;
  return {
    rejectUnauthorized: false,
    ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}),
  };
}

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => {
    // WHY: Lambda 런타임에서 SSM 로더가 `DATABASE_URL` 단일 문자열을 주입한다.
    // 로컬 개발은 개별 env (HOST/PORT/USER/PASSWORD/NAME) 를 쓰는 docker-compose
    // 환경. 둘 다 지원해 배포 환경별로 다른 config 파일을 유지하지 않는다.
    const url = process.env.DATABASE_URL;

    return {
      type: 'postgres',
      ...(url
        ? { url }
        : {
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT || '5432', 10),
            username: requireInProduction('DATABASE_USERNAME', 'postgres'),
            password: requireInProduction('DATABASE_PASSWORD', 'postgres'),
            database: process.env.DATABASE_NAME || 'todolist',
          }),
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
      migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
      // WHY: Lambda 콜드스타트마다 부팅이 일어나면 여러 인스턴스가 동시에 마이그레이션을
      // 실행해 중복/경쟁 조건이 발생한다. 마이그레이션은 배포 파이프라인의 one-shot
      // 잡(`npm run migration:run`)에서만 수행한다. (INFRA_SPEC.md §7-1, §8-⑦)
      migrationsRun: false,
      subscribers: [AuditSubscriber],
      ssl: buildSslConfig(),
      // WHY: Lambda(서버리스) + Supabase pooler(transaction mode, 6543) 환경.
      // Lambda 인스턴스당 단일 커넥션으로 고정해 Free 60 conn 한도 폭주를 방지하고,
      // 짧은 statement_timeout 으로 hung query 가 Lambda 타임아웃까지 끌고 가는 것을 막는다.
      extra: {
        max: 1,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000,
      },
    };
  },
);
