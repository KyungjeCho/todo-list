/**
 * SSM Parameter Store 시크릿 로더 — Lambda 콜드스타트 1회 실행.
 *
 * WHY: Lambda env var 에는 SSM **이름**만 (`*_PARAM`) 주입돼 있고, 실제 시크릿
 * 값은 런타임에 SSM 에서 GetParameters 로 일괄 로드해 process.env 에 주입한다.
 * (docs/INFRA_SPEC.md §3.2, §7-2) — 시크릿 평문이 CloudFormation 템플릿/CW
 * 로그에 노출되는 것을 차단.
 *
 * 동작:
 * 1. `*_PARAM` 7종 env 의 값(SSM 파라미터 이름) 수집 → 누락 시 throw
 * 2. SSMClient.GetParameters(WithDecryption=true) 1회 호출 (≤10개라 페이지네이션 불필요)
 * 3. `*_PARAM` 접미사를 뗀 키로 process.env 주입
 * 4. 캐시 — 동일 컨테이너의 후속 invocation 은 SSM 호출 생략
 * 5. 실패 시 throw (캐시 미저장) → 다음 invocation 재시도 가능
 */
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';

/**
 * 7종 시크릿의 `*_PARAM` env key → 주입 대상 env key 매핑.
 *
 * `infra/lib/todolist-backend-stack.ts` 의 `buildSsmParamNameEnv` 와 1:1 대응.
 */
const SECRET_PARAM_ENV_MAPPING: ReadonlyArray<{
  paramEnvKey: string;
  targetEnvKey: string;
}> = [
  { paramEnvKey: 'DATABASE_URL_PARAM', targetEnvKey: 'DATABASE_URL' },
  { paramEnvKey: 'JWT_SECRET_PARAM', targetEnvKey: 'JWT_SECRET' },
  {
    paramEnvKey: 'JWT_REFRESH_SECRET_PARAM',
    targetEnvKey: 'JWT_REFRESH_SECRET',
  },
  {
    paramEnvKey: 'OAUTH_STATE_SECRET_PARAM',
    targetEnvKey: 'OAUTH_STATE_SECRET',
  },
  { paramEnvKey: 'APPLE_PRIVATE_KEY_PARAM', targetEnvKey: 'APPLE_PRIVATE_KEY' },
  {
    paramEnvKey: 'FCM_SERVICE_ACCOUNT_JSON_PARAM',
    targetEnvKey: 'FCM_SERVICE_ACCOUNT_JSON',
  },
  { paramEnvKey: 'GEMINI_API_KEY_PARAM', targetEnvKey: 'GEMINI_API_KEY' },
];

let cachedLoadPromise: Promise<void> | null = null;

/**
 * 콜드스타트 시 SSM 시크릿을 process.env 로 로드.
 *
 * @throws 필수 `*_PARAM` env 누락 / SSM 호출 실패 / InvalidParameters 응답
 */
export async function loadSecretsFromSsm(): Promise<void> {
  if (cachedLoadPromise) return cachedLoadPromise;

  const promise = doLoad().catch((err) => {
    cachedLoadPromise = null;
    throw err;
  });
  cachedLoadPromise = promise;
  return promise;
}

async function doLoad(): Promise<void> {
  const nameToTarget = new Map<string, string>();
  const missing: string[] = [];

  for (const { paramEnvKey, targetEnvKey } of SECRET_PARAM_ENV_MAPPING) {
    const ssmName = process.env[paramEnvKey];
    if (!ssmName) {
      missing.push(paramEnvKey);
      continue;
    }
    nameToTarget.set(ssmName, targetEnvKey);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required SSM param env vars: ${missing.join(', ')}`,
    );
  }

  const client = new SSMClient({});
  const result = await client.send(
    new GetParametersCommand({
      Names: Array.from(nameToTarget.keys()),
      WithDecryption: true,
    }),
  );

  if (result.InvalidParameters && result.InvalidParameters.length > 0) {
    throw new Error(
      `SSM returned InvalidParameters: ${result.InvalidParameters.join(', ')}`,
    );
  }

  for (const param of result.Parameters ?? []) {
    if (!param.Name || param.Value === undefined) continue;
    const targetKey = nameToTarget.get(param.Name);
    if (targetKey) {
      process.env[targetKey] = param.Value;
    }
  }
}

/** 테스트 전용 — 캐시 리셋. 운영 코드에서 호출 금지. */
export function __resetSsmLoaderForTests(): void {
  cachedLoadPromise = null;
}
