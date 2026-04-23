/**
 * SSM 파라미터 로더 테스트.
 *
 * WHY: Lambda 콜드스타트 시 SSM 에서 시크릿을 로드해 process.env 에 주입한다.
 * 잘못 주입되면 NestJS 부트스트랩이 실패하거나 잘못된 시크릿으로 운영되므로
 * 캐시·매핑·에러 전파를 엄격히 검증한다.
 */
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { loadSecretsFromSsm, __resetSsmLoaderForTests } from './ssm-loader';

// WHY: SSMClient 만 mock (send 가로채기). GetParametersCommand 는 실제 클래스
// 그대로 사용 — input 인자 검증 가능.
jest.mock('@aws-sdk/client-ssm', () => {
  const actual = jest.requireActual('@aws-sdk/client-ssm');
  return {
    ...actual,
    SSMClient: jest.fn(),
  };
});

const SsmClientMock = SSMClient as jest.MockedClass<typeof SSMClient>;

const PARAM_ENV = {
  DATABASE_URL_PARAM: '/todolist/dev/database_url',
  JWT_SECRET_PARAM: '/todolist/dev/jwt_secret',
  JWT_REFRESH_SECRET_PARAM: '/todolist/dev/jwt_refresh_secret',
  OAUTH_STATE_SECRET_PARAM: '/todolist/dev/oauth_state_secret',
  APPLE_PRIVATE_KEY_PARAM: '/todolist/dev/apple_private_key',
  FCM_SERVICE_ACCOUNT_JSON_PARAM: '/todolist/dev/fcm_service_account_json',
  GEMINI_API_KEY_PARAM: '/todolist/dev/gemini_api_key',
};

const TARGET_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'OAUTH_STATE_SECRET',
  'APPLE_PRIVATE_KEY',
  'FCM_SERVICE_ACCOUNT_JSON',
  'GEMINI_API_KEY',
];

const ssmResponseFor = (
  names: string[],
): { Parameters: { Name: string; Value: string }[] } => ({
  Parameters: names.map((Name) => ({ Name, Value: `value-of-${Name}` })),
});

describe('loadSecretsFromSsm', () => {
  let sendMock: jest.Mock;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    sendMock = jest.fn();
    SsmClientMock.mockImplementation(
      () => ({ send: sendMock }) as unknown as SSMClient,
    );
    process.env = { ...originalEnv, ...PARAM_ENV };
    for (const key of TARGET_KEYS) delete process.env[key];
    __resetSsmLoaderForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('7종 파라미터 이름으로 GetParametersCommand 호출 (WithDecryption=true)', async () => {
    sendMock.mockResolvedValueOnce(ssmResponseFor(Object.values(PARAM_ENV)));
    await loadSecretsFromSsm();

    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = sendMock.mock.calls[0][0] as GetParametersCommand;
    expect(cmd).toBeInstanceOf(GetParametersCommand);
    expect(cmd.input.Names?.sort()).toEqual(Object.values(PARAM_ENV).sort());
    expect(cmd.input.WithDecryption).toBe(true);
  });

  // WHY: Lambda 의 다른 모듈은 시크릿 키(DATABASE_URL 등)를 읽음. _PARAM 접미사
  // 가 빠진 키로 정확히 매핑돼야 한다.
  it('SSM 응답을 *_PARAM 접미사를 뗀 env key 로 process.env 주입', async () => {
    sendMock.mockResolvedValueOnce(ssmResponseFor(Object.values(PARAM_ENV)));
    await loadSecretsFromSsm();

    expect(process.env.DATABASE_URL).toBe(
      'value-of-/todolist/dev/database_url',
    );
    expect(process.env.JWT_SECRET).toBe('value-of-/todolist/dev/jwt_secret');
    expect(process.env.GEMINI_API_KEY).toBe(
      'value-of-/todolist/dev/gemini_api_key',
    );
  });

  // WHY: 콜드스타트당 1회만 SSM 호출. 동일 컨테이너의 후속 invocation 에서 비용·
  // 지연 절약. 모든 파라미터가 캐시되므로 부분 캐시 누락 없음.
  it('재호출 시 SSM 을 다시 호출하지 않음 (캐시)', async () => {
    sendMock.mockResolvedValueOnce(ssmResponseFor(Object.values(PARAM_ENV)));
    await loadSecretsFromSsm();
    await loadSecretsFromSsm();
    await loadSecretsFromSsm();

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  // WHY: SSM 호출 실패 시 잘못된 시크릿으로 부트스트랩 진행 금지. throw 하면
  // Lambda 가 invocation 을 실패로 기록 → 콜드스타트 재시도 또는 alias 롤백 트리거.
  it('SSM 호출 실패 시 throw + 캐시 미저장 (다음 invocation 재시도 가능)', async () => {
    const err = new Error('SSM AccessDenied');
    sendMock.mockRejectedValueOnce(err);

    await expect(loadSecretsFromSsm()).rejects.toThrow('SSM AccessDenied');

    sendMock.mockResolvedValueOnce(ssmResponseFor(Object.values(PARAM_ENV)));
    await loadSecretsFromSsm();
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  // WHY: 누락된 파라미터로 부트스트랩이 진행되면 NestJS DI 가 잘못된 의존성을
  // 주입할 수 있다. 누락은 즉시 실패로 처리.
  it('SSM 응답에 InvalidParameters 가 있으면 throw — 누락 시크릿 차단', async () => {
    sendMock.mockResolvedValueOnce({
      Parameters: ssmResponseFor(Object.values(PARAM_ENV).slice(0, 6))
        .Parameters,
      InvalidParameters: ['/todolist/dev/gemini_api_key'],
    });

    await expect(loadSecretsFromSsm()).rejects.toThrow(
      /InvalidParameters.*gemini_api_key/,
    );
  });

  // WHY: *_PARAM env 가 하나라도 빠지면 운영자 실수. 부트스트랩 전 즉시 알림.
  it('필수 *_PARAM env 가 누락되면 throw (SSM 호출 전)', async () => {
    delete process.env.JWT_SECRET_PARAM;

    await expect(loadSecretsFromSsm()).rejects.toThrow(/JWT_SECRET_PARAM/);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
