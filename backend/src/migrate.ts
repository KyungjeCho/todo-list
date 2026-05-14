/**
 * Migration Lambda 엔트리 — deploy 파이프라인의 one-shot 호출 전용.
 *
 * WHY: Lambda 콜드스타트에서 여러 api 인스턴스가 migration 을 동시 실행하면 경쟁
 * 조건이 발생한다. api/cron Lambda 는 `migrationsRun: false` 로 자체 실행을 막고,
 * 배포 시점에만 이 전용 Lambda 를 `reservedConcurrentExecutions=1` 로 단독 호출해
 * TypeORM migration:run 을 수행한다. 성공 후에만 api/cron 이미지 교체가 이어진다.
 * (docs/INFRA_SPEC.md §7-1, §8-⑦)
 *
 * 호출 방식:
 *   aws lambda invoke \
 *     --function-name todolist-migrate-{env} \
 *     --payload '{}' \
 *     --cli-binary-format raw-in-base64-out \
 *     out.json
 *
 * 반환 payload:
 *   { ok: true, appliedMigrations: ["..."], durationMs: 123 }
 *
 * 실패 시: throw 발생 → Lambda 는 FunctionError=Unhandled 로 응답. 호출자(GH
 * Actions)는 payload 의 errorMessage 로 실패 인지 후 rollback 단계 진입.
 */
import 'reflect-metadata';
import type { Handler } from 'aws-lambda';
import { loadSecretsFromSsm } from './common/config/ssm-loader';
import { AppDataSource } from './data-source';

export interface MigrateResult {
  ok: true;
  appliedMigrations: string[];
  durationMs: number;
}

export const handler: Handler<unknown, MigrateResult> = async () => {
  // 콜드스타트당 1회 — SSM 에서 DATABASE_URL 을 포함한 시크릿을 process.env 주입.
  await loadSecretsFromSsm();

  const start = Date.now();
  // WHY: AppDataSource 가 모듈 로드 시 생성되지만 실제 연결은 initialize() 에서.
  // 콜드스타트 간 같은 인스턴스가 재호출될 수 있으므로 isInitialized 체크.
  const ds = AppDataSource.isInitialized
    ? AppDataSource
    : await AppDataSource.initialize();
  try {
    const applied = await ds.runMigrations();
    return {
      ok: true,
      appliedMigrations: applied.map((m) => m.name),
      durationMs: Date.now() - start,
    };
  } finally {
    // WHY: invocation 종료 후 커넥션 반환. Lambda 컨테이너가 warm 상태로 재활용될
    // 때 다음 호출에서 initialize() 가 다시 동작하도록. Supabase pooler 의 60 conn
    // 한도를 보호.
    if (ds.isInitialized) {
      await ds.destroy();
    }
  }
};
