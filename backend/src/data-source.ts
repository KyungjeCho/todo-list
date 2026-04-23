import 'reflect-metadata';
import { join } from 'path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

loadEnv();

/**
 * TypeORM CLI 용 DataSource.
 *
 * WHY: `npm run migration:run` / `migration:revert` 는 런타임 Nest 컨테이너 외부에서
 * 실행되므로 `databaseConfig` 의 DI 기반 팩토리를 재사용할 수 없다. 동일한 env 변수를
 * 참조하는 경량 DataSource 를 별도로 정의하여 앱 부팅 시 자동 실행(`migrationsRun: true`)
 * 과 CLI 수동 실행 양쪽을 커버한다.
 */
// WHY: Lambda 런타임(SSM 로더)은 단일 `DATABASE_URL` 연결 문자열을 주입하지만,
// 로컬 개발(docker compose)은 HOST/PORT/USER 개별 env 를 사용한다. 양쪽을 모두
// 지원해 `npm run migration:run` CLI 와 migration Lambda 가 동일 data source 를
// 공유하게 한다. (docs/INFRA_SPEC.md §3.2, §7-1)
const url = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(url
    ? { url }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'todolist',
      }),
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'common', 'migrations', '*{.ts,.js}')],
  ssl:
    url || process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
      : false,
});
