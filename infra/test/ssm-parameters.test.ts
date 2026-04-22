import {
  SSM_PARAMETER_PREFIX,
  ssmParameterNames,
  ssmParameterPathArn,
} from '../lib/ssm-parameters';

describe('ssmParameterNames', () => {
  // WHY: env 별 격리(/todolist/dev/ vs /todolist/prod/)로 IAM 권한 범위와
  // 운영 사고 시 영향 반경을 좁힌다.
  it('모든 파라미터가 `/todolist/{env}/` 프리픽스를 가진다', () => {
    const names = ssmParameterNames('dev');
    Object.values(names).forEach((name) => {
      expect(name.startsWith(`${SSM_PARAMETER_PREFIX}/dev/`)).toBe(true);
    });
  });

  // WHY: snake_case 는 AWS CLI 인자/bash env 변수와 1:1 매핑이 자연스럽다.
  it('마지막 세그먼트는 snake_case 영소문자/숫자/언더스코어만', () => {
    const names = ssmParameterNames('dev');
    Object.values(names).forEach((name) => {
      const last = name.split('/').pop()!;
      expect(last).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });

  it('필수 파라미터 키 7종을 노출한다 — 시크릿 누락 방지', () => {
    const names = ssmParameterNames('dev');
    expect(Object.keys(names).sort()).toEqual(
      [
        'applePrivateKey',
        'databaseUrl',
        'fcmServiceAccountJson',
        'geminiApiKey',
        'jwtRefreshSecret',
        'jwtSecret',
        'oauthStateSecret',
      ].sort(),
    );
  });

  it('env 가 다르면 모든 이름의 env 세그먼트도 달라진다', () => {
    const dev = ssmParameterNames('dev');
    const prod = ssmParameterNames('prod');
    expect(dev.databaseUrl).not.toBe(prod.databaseUrl);
    expect(prod.databaseUrl).toContain('/prod/');
  });
});

describe('ssmParameterPathArn', () => {
  it('와일드카드 경로 ARN 생성 — IAM 정책의 Resource 로 사용', () => {
    const arn = ssmParameterPathArn('ap-northeast-2', '123456789012', 'dev');
    expect(arn).toBe(
      'arn:aws:ssm:ap-northeast-2:123456789012:parameter/todolist/dev/*',
    );
  });
});
