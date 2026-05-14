/**
 * Cron Lambda 엔트리 — EventBridge Scheduler 가 호출.
 *
 * WHY: 한 Lambda(`todolist-cron-{env}`)에서 spec §5.1 의 3개 cron 잡을 모두
 * 처리한다. 동일 NestJS 컨테이너를 재사용해 콜드스타트 비용 절약. EventBridge
 * 가 `{ "job": "..." }` 페이로드로 분기 정보 전달.
 *
 * 라우팅 (docs/INFRA_SPEC.md §5.2):
 * - daily-review-notify → NotificationSchedulerUsecase.execute(now)
 * - carry-over-cleanup  → CarryoverSchedulerUsecase.execute(now)
 * - fcm-token-prune     → no-op (백엔드 usecase 미구현, 추후 PR)
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import type { Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { CarryoverSchedulerUsecase } from './scheduler/application/carryover-scheduler.usecase';
import { NotificationSchedulerUsecase } from './scheduler/application/notification-scheduler.usecase';
import { loadSecretsFromSsm } from './common/config/ssm-loader';

const logger = new Logger('SchedulerHandler');

let cachedAppPromise: Promise<INestApplicationContext> | null = null;

async function getApp(): Promise<INestApplicationContext> {
  if (cachedAppPromise) return cachedAppPromise;
  cachedAppPromise = bootstrap().catch((err) => {
    cachedAppPromise = null;
    throw err;
  });
  return cachedAppPromise;
}

async function bootstrap(): Promise<INestApplicationContext> {
  await loadSecretsFromSsm();
  return NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
}

export const handler: Handler = async (event: unknown): Promise<void> => {
  const job = (event as { job?: unknown })?.job;
  if (typeof job !== 'string' || job.length === 0) {
    throw new Error('scheduler event missing required `job` field');
  }

  const app = await getApp();
  const now = new Date();

  switch (job) {
    case 'daily-review-notify': {
      logger.log(`Running job=${job}`);
      await app.get(NotificationSchedulerUsecase).execute(now);
      return;
    }
    case 'carry-over-cleanup': {
      logger.log(`Running job=${job}`);
      await app.get(CarryoverSchedulerUsecase).execute(now);
      return;
    }
    case 'fcm-token-prune': {
      // WHY: backend 의 FCM token prune usecase 미구현. 라우터는 잡을 인식하되
      // 실제 작업은 후속 PR. EventBridge Schedule 은 비활성화하지 않고 no-op
      // 으로 두어 인프라 변경 없이 backend 추가 시 즉시 작동.
      logger.warn(`job=${job} not yet implemented in backend — no-op (skip)`);
      return;
    }
    default:
      throw new Error(`unknown job: ${job}`);
  }
};

/** 테스트 전용 — 캐시 리셋. 운영 코드에서 호출 금지. */
export function __resetSchedulerForTests(): void {
  cachedAppPromise = null;
}
