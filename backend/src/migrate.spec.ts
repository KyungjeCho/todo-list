/**
 * Migration Lambda 핸들러 테스트.
 *
 * WHY: deploy 파이프라인의 선행 단계. 실패 시 api/cron 이미지 교체가 막혀야
 * 하고, 성공 시 적용된 마이그레이션 목록을 응답 payload 로 돌려줘야 한다.
 * SSM 로드 → DataSource 초기화 → runMigrations → destroy 순서가 보장되는지
 * 검증.
 */
import { loadSecretsFromSsm } from './common/config/ssm-loader';
import { AppDataSource } from './data-source';
import { handler } from './migrate';

jest.mock('./common/config/ssm-loader');
jest.mock('./data-source', () => ({
  AppDataSource: {
    isInitialized: false,
    initialize: jest.fn(),
    destroy: jest.fn(),
    runMigrations: jest.fn(),
  },
}));

const mockedLoadSsm = loadSecretsFromSsm as jest.MockedFunction<
  typeof loadSecretsFromSsm
>;

type DsMock = {
  isInitialized: boolean;
  initialize: jest.Mock;
  destroy: jest.Mock;
  runMigrations: jest.Mock;
};
const ds = AppDataSource as unknown as DsMock;

describe('migrate handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadSsm.mockResolvedValue(undefined);
    ds.isInitialized = false;
    // WHY: 실 TypeORM 처럼 initialize() 후 isInitialized 가 true 가 되도록 모사.
    // 그렇지 않으면 handler 의 finally 블록에서 destroy 가 호출 안 됨.
    ds.initialize.mockImplementation(() => {
      ds.isInitialized = true;
      return Promise.resolve(ds);
    });
    ds.destroy.mockImplementation(() => {
      ds.isInitialized = false;
      return Promise.resolve();
    });
  });

  it('SSM 로드 → initialize → runMigrations → destroy 순서로 실행', async () => {
    ds.runMigrations.mockResolvedValue([
      { name: '1711411200000-InitialSchema' },
      { name: '1711411200001-AddUniqueFromTodoId' },
    ]);

    const callOrder: string[] = [];
    mockedLoadSsm.mockImplementation(() => {
      callOrder.push('ssm');
      return Promise.resolve();
    });
    ds.initialize.mockImplementation(() => {
      callOrder.push('initialize');
      ds.isInitialized = true;
      return Promise.resolve(ds);
    });
    ds.runMigrations.mockImplementation(() => {
      callOrder.push('runMigrations');
      return Promise.resolve([]);
    });
    ds.destroy.mockImplementation(() => {
      callOrder.push('destroy');
      ds.isInitialized = false;
      return Promise.resolve();
    });

    await handler({}, {} as never, () => undefined);
    expect(callOrder).toEqual([
      'ssm',
      'initialize',
      'runMigrations',
      'destroy',
    ]);
  });

  it('적용된 마이그레이션 이름 배열을 반환', async () => {
    ds.runMigrations.mockResolvedValue([{ name: 'MigA' }, { name: 'MigB' }]);
    const result = await handler({}, {} as never, () => undefined);
    expect(result).toMatchObject({
      ok: true,
      appliedMigrations: ['MigA', 'MigB'],
    });
    expect(
      (result as { durationMs: number }).durationMs,
    ).toBeGreaterThanOrEqual(0);
  });

  it('마이그레이션 없을 때 빈 배열 반환 (no-op 정상)', async () => {
    ds.runMigrations.mockResolvedValue([]);
    const result = await handler({}, {} as never, () => undefined);
    expect(result).toMatchObject({ ok: true, appliedMigrations: [] });
  });

  it('이미 초기화된 DataSource 는 재초기화 안 함 (warm invocation)', async () => {
    ds.isInitialized = true;
    ds.runMigrations.mockResolvedValue([]);
    await handler({}, {} as never, () => undefined);
    expect(ds.initialize).not.toHaveBeenCalled();
  });

  it('runMigrations 실패 시에도 destroy 호출 (커넥션 누수 방지)', async () => {
    ds.runMigrations.mockRejectedValue(new Error('migration boom'));
    ds.isInitialized = false;
    // initialize 후엔 isInitialized true 라고 가정
    ds.initialize.mockImplementation(() => {
      ds.isInitialized = true;
      return Promise.resolve(ds);
    });

    await expect(handler({}, {} as never, () => undefined)).rejects.toThrow(
      'migration boom',
    );
    expect(ds.destroy).toHaveBeenCalledTimes(1);
  });

  it('SSM 로드 실패 시 DataSource 초기화 전에 throw', async () => {
    mockedLoadSsm.mockRejectedValue(new Error('ssm boom'));
    await expect(handler({}, {} as never, () => undefined)).rejects.toThrow(
      'ssm boom',
    );
    expect(ds.initialize).not.toHaveBeenCalled();
  });
});
