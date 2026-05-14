/**
 * SSM Parameter Store 명명 규약.
 *
 * WHY: 시크릿/설정 파라미터의 경로를 한 곳에서 관리해 Stack(권한 부여) 과
 * Lambda(런타임 로드) 양쪽이 동일한 이름을 참조하도록 보장한다.
 *
 * 시크릿 값(SecureString) 자체는 CDK 가 아닌 운영자가 `aws ssm put-parameter`
 * 로 수동 등록한다 — git 에 시크릿 유출 방지 + CloudFormation 의 SecureString
 * 미지원 회피. (docs/INFRA_SPEC.md §3.2, §7-6 RUNBOOK_DEPLOY)
 */

export const SSM_PARAMETER_PREFIX = '/todolist';

export interface SsmParameterNames {
  /** Supabase pooler 연결 문자열 (postgres://...:6543/postgres). SecureString. */
  databaseUrl: string;
  /** JWT access token 서명 시크릿. SecureString. */
  jwtSecret: string;
  /** JWT refresh token 서명 시크릿. SecureString. */
  jwtRefreshSecret: string;
  /** OAuth state 서명용 HMAC 시크릿. SecureString. */
  oauthStateSecret: string;
  /** Apple Sign In 용 .p8 private key (PEM 본문). SecureString. */
  applePrivateKey: string;
  /** Firebase service account JSON 전체. SecureString. */
  fcmServiceAccountJson: string;
  /** Gemini Flash API key (음성/AI). SecureString. */
  geminiApiKey: string;
}

/**
 * env 별 파라미터 경로 매핑. 각 값은 `/todolist/{env}/{key}` 형태.
 */
export const ssmParameterNames = (envName: string): SsmParameterNames => {
  const base = `${SSM_PARAMETER_PREFIX}/${envName}`;
  return {
    databaseUrl: `${base}/database_url`,
    jwtSecret: `${base}/jwt_secret`,
    jwtRefreshSecret: `${base}/jwt_refresh_secret`,
    oauthStateSecret: `${base}/oauth_state_secret`,
    applePrivateKey: `${base}/apple_private_key`,
    fcmServiceAccountJson: `${base}/fcm_service_account_json`,
    geminiApiKey: `${base}/gemini_api_key`,
  };
};

/**
 * IAM 정책의 Resource 로 사용할 와일드카드 ARN.
 *
 * WHY: 개별 파라미터별 ARN 을 나열하지 않고 prefix-wildcard 1개로 권한을 부여한다.
 * 새 파라미터 추가 시 IAM 정책 변경 없이 자동 포함.
 */
export const ssmParameterPathArn = (
  region: string,
  account: string,
  envName: string,
): string =>
  `arn:aws:ssm:${region}:${account}:parameter${SSM_PARAMETER_PREFIX}/${envName}/*`;
