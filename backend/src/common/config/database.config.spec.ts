import { databaseConfig } from './database.config';

type DbConfig = {
  migrationsRun: boolean;
  extra: {
    max: number;
    connectionTimeoutMillis: number;
    statement_timeout: number;
  };
  ssl: false | { rejectUnauthorized: boolean; ca?: string };
};

const invokeConfig = (): DbConfig => databaseConfig() as unknown as DbConfig;

describe('databaseConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('migrationsRun (Lambda 안전장치)', () => {
    // WHY: Lambda 콜드스타트마다 부팅이 일어나 여러 인스턴스가 동시에 마이그레이션을
    // 실행하면 중복/경쟁 조건이 발생한다. 마이그레이션은 배포 파이프라인의 one-shot
    // 잡에서만 수행하도록 강제한다. (INFRA_SPEC.md §7-1, §8-⑦)
    it('항상 false', () => {
      expect(invokeConfig().migrationsRun).toBe(false);
    });
  });

  describe('extra (커넥션 풀 옵션)', () => {
    // WHY: Supabase Free 60 conn 제한. Lambda 동시성 × pg 기본 pool(10)으로 폭주 방지.
    it('max=1', () => {
      expect(invokeConfig().extra.max).toBe(1);
    });

    it('connectionTimeoutMillis=5000', () => {
      expect(invokeConfig().extra.connectionTimeoutMillis).toBe(5000);
    });

    it('statement_timeout=10000', () => {
      expect(invokeConfig().extra.statement_timeout).toBe(10000);
    });
  });

  describe('SSL (Supabase 강제)', () => {
    // WHY: Supabase는 항상 TLS 필요. env 토글 누락 시 prod 연결 실패를 막기 위해
    // production 환경에서는 무조건 SSL 활성. (INFRA_SPEC.md §2.1, §8-③)
    const setProd = (): void => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_USERNAME = 'u';
      process.env.DATABASE_PASSWORD = 'p';
    };

    it('production + CA 미제공: SSL 활성 + rejectUnauthorized=false (Supabase pooler 호환)', () => {
      setProd();
      delete process.env.DATABASE_SSL;
      delete process.env.DATABASE_SSL_CA;
      expect(invokeConfig().ssl).toEqual({ rejectUnauthorized: false });
    });

    it('production + DATABASE_SSL=true: 동일 동작', () => {
      setProd();
      process.env.DATABASE_SSL = 'true';
      delete process.env.DATABASE_SSL_CA;
      expect(invokeConfig().ssl).toEqual({ rejectUnauthorized: false });
    });

    it('non-production: DATABASE_SSL 미설정이면 SSL 비활성 (로컬 Docker Postgres)', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_SSL;
      expect(invokeConfig().ssl).toBe(false);
    });

    it('non-production: DATABASE_SSL=true 이면 self-signed 허용으로 활성', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_SSL = 'true';
      expect(invokeConfig().ssl).toEqual(
        expect.objectContaining({ rejectUnauthorized: false }),
      );
    });
  });
});
