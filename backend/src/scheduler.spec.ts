/**
 * Cron Lambda 핸들러 테스트.
 *
 * WHY: EventBridge Scheduler 가 보내는 `{ job: '...' }` 페이로드를 받아
 * 알맞은 usecase 메서드로 라우팅한다. 잘못 라우팅되면 잘못된 잡이 실행되거나
 * (DB 갱신 사고) 알람만 울리고 잡이 실행 안 됨(스펙 위반). 라우팅·콜드스타트·
 * 에러 전파를 검증.
 */
import {
  __resetSchedulerForTests,
  handler as schedulerHandler,
} from './scheduler';
import { NotificationSchedulerUsecase } from './scheduler/application/notification-scheduler.usecase';
import { CarryoverSchedulerUsecase } from './scheduler/application/carryover-scheduler.usecase';
import { loadSecretsFromSsm } from './common/config/ssm-loader';

jest.mock('./common/config/ssm-loader');

const notifExecute = jest.fn();
const carryoverExecute = jest.fn();
const closeMock = jest.fn();

const appContextMock = {
  get: jest.fn((token: unknown) => {
    if (token === NotificationSchedulerUsecase) {
      return { execute: notifExecute };
    }
    if (token === CarryoverSchedulerUsecase) {
      return { execute: carryoverExecute };
    }
    throw new Error(`unexpected token: ${String(token)}`);
  }),
  close: closeMock,
};

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn(() => Promise.resolve(appContextMock)),
  },
}));

const mockedLoadSsm = loadSecretsFromSsm as jest.MockedFunction<
  typeof loadSecretsFromSsm
>;

import { NestFactory } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/unbound-method
const createCtx = NestFactory.createApplicationContext as jest.MockedFunction<
  typeof NestFactory.createApplicationContext
>;

const lambdaCtx = {} as Parameters<typeof schedulerHandler>[1];
const callback = jest.fn() as Parameters<typeof schedulerHandler>[2];

describe('scheduler.handler — Lambda cron 라우터', () => {
  beforeEach(() => {
    notifExecute.mockReset().mockResolvedValue(undefined);
    carryoverExecute.mockReset().mockResolvedValue(undefined);
    closeMock.mockReset().mockResolvedValue(undefined);
    appContextMock.get.mockClear();
    mockedLoadSsm.mockReset().mockResolvedValue(undefined);
    createCtx.mockClear();
    __resetSchedulerForTests();
  });

  // WHY: SSM 시크릿 없이 부트스트랩하면 DB/서드파티 호출이 즉시 실패.
  // 잡 실행 전 반드시 1회 로드.
  it('첫 invocation 에서 SSM 로더와 Nest context 부트스트랩을 1회 실행', async () => {
    await schedulerHandler({ job: 'daily-review-notify' }, lambdaCtx, callback);

    expect(mockedLoadSsm).toHaveBeenCalledTimes(1);
    expect(createCtx).toHaveBeenCalledTimes(1);
  });

  // WHY: 컨테이너 재사용 시 부트스트랩 비용 절약. 캐시 동작 확인.
  it('이후 invocation 에서는 부트스트랩 재호출 안 함 (캐시)', async () => {
    await schedulerHandler({ job: 'daily-review-notify' }, lambdaCtx, callback);
    await schedulerHandler({ job: 'carry-over-cleanup' }, lambdaCtx, callback);
    await schedulerHandler({ job: 'daily-review-notify' }, lambdaCtx, callback);

    expect(mockedLoadSsm).toHaveBeenCalledTimes(1);
    expect(createCtx).toHaveBeenCalledTimes(1);
  });

  it('daily-review-notify → NotificationSchedulerUsecase.execute(new Date())', async () => {
    await schedulerHandler({ job: 'daily-review-notify' }, lambdaCtx, callback);

    expect(notifExecute).toHaveBeenCalledTimes(1);
    expect(notifExecute.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(carryoverExecute).not.toHaveBeenCalled();
  });

  it('carry-over-cleanup → CarryoverSchedulerUsecase.execute(new Date())', async () => {
    await schedulerHandler({ job: 'carry-over-cleanup' }, lambdaCtx, callback);

    expect(carryoverExecute).toHaveBeenCalledTimes(1);
    expect(carryoverExecute.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(notifExecute).not.toHaveBeenCalled();
  });

  // WHY: backend 에 FCM token prune 미구현. 라우터는 잡을 인식하되 no-op.
  // 알람을 울리지 않으면서도 미구현 상태를 명확히 로깅.
  it('fcm-token-prune → no-op (백엔드 미구현, 알람 회피)', async () => {
    await expect(
      schedulerHandler({ job: 'fcm-token-prune' }, lambdaCtx, callback),
    ).resolves.toBeUndefined();

    expect(notifExecute).not.toHaveBeenCalled();
    expect(carryoverExecute).not.toHaveBeenCalled();
  });

  // WHY: 알 수 없는 잡 이름은 EventBridge 설정 오류 신호. 즉시 throw 해서
  // 알람·DLQ 로 가시화.
  it('unknown job → throw', async () => {
    await expect(
      schedulerHandler({ job: 'mystery' }, lambdaCtx, callback),
    ).rejects.toThrow(/unknown job: mystery/);
  });

  it('event 가 job 필드 없으면 throw', async () => {
    await expect(schedulerHandler({}, lambdaCtx, callback)).rejects.toThrow(
      /job/,
    );
  });

  // WHY: 잡 자체가 실패하면 Lambda invocation 도 실패해야 EventBridge 가
  // CloudWatch Errors 메트릭에 기록 → 알람 발화.
  it('usecase 실패 시 그대로 throw — Lambda Errors 메트릭 보존', async () => {
    notifExecute.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(
      schedulerHandler({ job: 'daily-review-notify' }, lambdaCtx, callback),
    ).rejects.toThrow('DB connection lost');
  });
});
