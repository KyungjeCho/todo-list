import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { TodolistBackendStack } from '../lib/todolist-backend-stack';

const synth = (envName: string): Template => {
  const app = new cdk.App();
  const stack = new TodolistBackendStack(app, `TodolistBackend-${envName}`, {
    envName,
  });
  return Template.fromStack(stack);
};

const synthWithGrant = (envName: string): Template => {
  const app = new cdk.App();
  const stack = new TodolistBackendStack(app, `TodolistBackend-${envName}`, {
    envName,
    env: { account: '123456789012', region: 'ap-northeast-2' },
  });
  const role = new iam.Role(stack, 'DummyLambdaRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  });
  stack.grantSsmRead(role);
  return Template.fromStack(stack);
};

describe('TodolistBackendStack — ECR Repository', () => {
  // WHY: env별로 별도 ECR 을 두어 dev 이미지 오염이 prod 에 전파되지 않도록 격리한다.
  it('환경별 이름(`todolist-backend-{env}`)으로 1개 생성', () => {
    const template = synth('dev');
    template.resourceCountIs('AWS::ECR::Repository', 1);
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'todolist-backend-dev',
    });
  });

  it('image scan on push 활성 — 푸시 시점 CVE 자동 검출', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageScanningConfiguration: { ScanOnPush: true },
    });
  });

  // WHY: 동일 SHA 태그로 다른 이미지를 덮어쓰는 사고를 차단한다. 이미지 무결성 보장.
  it('태그 IMMUTABLE — 동일 SHA 재푸시 차단', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageTagMutability: 'IMMUTABLE',
    });
  });

  // WHY: cdk destroy 가 실수로 실행돼도 이미지를 보존한다. ECR 은 재생성 비용이 높음.
  it('RemovalPolicy=RETAIN — Stack 삭제 시 이미지 보존', () => {
    const template = synth('dev');
    template.hasResource('AWS::ECR::Repository', {
      DeletionPolicy: 'Retain',
    });
  });

  // WHY: 빌드마다 누적되는 이미지로 스토리지 비용이 무한 증가하는 것을 방지한다.
  it('Lifecycle 정책으로 최신 20개 이미지만 보존', () => {
    const template = synth('dev');
    const repos = template.findResources('AWS::ECR::Repository');
    const repoLogicalId = Object.keys(repos)[0];
    const lifecyclePolicy = repos[repoLogicalId].Properties
      .LifecyclePolicy as { LifecyclePolicyText: string } | undefined;

    expect(lifecyclePolicy).toBeDefined();
    const parsed = JSON.parse(lifecyclePolicy!.LifecyclePolicyText) as {
      rules: Array<{ selection: { countNumber: number } }>;
    };
    expect(parsed.rules[0].selection.countNumber).toBe(20);
  });

  it('CfnOutput 으로 RepositoryUri 노출 — CI 에서 docker push 대상으로 사용', () => {
    const template = synth('dev');
    template.hasOutput('BackendRepositoryUri', {});
  });

  it('prod 환경도 동일 옵션으로 생성', () => {
    const template = synth('prod');
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'todolist-backend-prod',
      ImageTagMutability: 'IMMUTABLE',
      ImageScanningConfiguration: { ScanOnPush: true },
    });
  });
});

describe('TodolistBackendStack — Lambda 함수 (api/cron)', () => {
  // WHY: api 와 cron 은 동일 이미지를 다른 핸들러로 호출하지만, 운영 특성(콜드스타트
  // 빈도, 타임아웃, 메모리)이 달라 별도 함수로 분리한다.
  it('api/cron 2개 함수 — `todolist-{api,cron}-{env}` 이름', () => {
    const template = synth('dev');
    template.resourceCountIs('AWS::Lambda::Function', 2);
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'todolist-api-dev',
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'todolist-cron-dev',
    });
  });

  // WHY: arm64(Graviton)는 x86 대비 ~20% 저렴 + 동등 이상 성능. nodejs:20 base.
  it('arm64 + Image 패키지 타입 — ECR 운영 리포의 placeholder 태그 참조', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Lambda::Function', {
      Architectures: ['arm64'],
      PackageType: 'Image',
      Code: {
        ImageUri: Match.objectLike({
          'Fn::Join': Match.arrayWith([
            Match.arrayWith([Match.stringLikeRegexp(':placeholder$')]),
          ]),
        }),
      },
    });
  });

  // WHY: api 는 사용자 요청 처리(타임아웃 짧게, 비용 ↓), cron 은 배치(긴 작업 허용).
  it('api 는 30s/512MB, cron 은 300s/1024MB 로 분리', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'todolist-api-dev',
      Timeout: 30,
      MemorySize: 512,
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'todolist-cron-dev',
      Timeout: 300,
      MemorySize: 1024,
    });
  });

  // WHY: SSM 파라미터 이름을 env var 로 주입 → backend ssm-loader 가 콜드스타트
  // 시 GetParameter 로 실제 값을 로드. CDK 는 값이 아닌 이름만 다룸(시크릿 격리).
  it('Lambda env var 로 SSM 파라미터 이름 7종 주입', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'todolist-api-dev',
      Environment: {
        Variables: Match.objectLike({
          NODE_ENV: 'production',
          DATABASE_URL_PARAM: '/todolist/dev/database_url',
          JWT_SECRET_PARAM: '/todolist/dev/jwt_secret',
          JWT_REFRESH_SECRET_PARAM: '/todolist/dev/jwt_refresh_secret',
          OAUTH_STATE_SECRET_PARAM: '/todolist/dev/oauth_state_secret',
          APPLE_PRIVATE_KEY_PARAM: '/todolist/dev/apple_private_key',
          FCM_SERVICE_ACCOUNT_JSON_PARAM:
            '/todolist/dev/fcm_service_account_json',
          GEMINI_API_KEY_PARAM: '/todolist/dev/gemini_api_key',
        }),
      },
    });
  });

  // WHY: Lambda 가 실제 시크릿을 읽으려면 IAM 권한 필요. grantSsmRead 가
  // 자동 적용되었는지 확인 — 명시적으로 호출 누락 시 런타임에 AccessDenied.
  it('실행 역할에 SSM/KMS 읽기 권한이 자동 부여됨', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['ssm:GetParameter']),
            Effect: 'Allow',
          }),
          Match.objectLike({
            Action: 'kms:Decrypt',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });
});

describe('TodolistBackendStack — Lambda Function URL (api 전용)', () => {
  // WHY: 도메인 미보유 + 초기 트래픽 0. API Gateway 비용 회피.
  // cron 은 외부 노출 불필요 → URL 없음.
  it('api 함수에만 Function URL 부여 (1개)', () => {
    const template = synth('dev');
    template.resourceCountIs('AWS::Lambda::Url', 1);
  });

  // WHY: AuthType=NONE 으로 외부 공개. 인증은 backend(NestJS) JWT 가드가 담당.
  // 절대 콘솔에서 AWS_IAM 으로 바꾸지 말 것 (모바일 앱 SigV4 불가).
  it('AuthType=NONE — 인증은 NestJS JWT 가 처리', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'NONE',
    });
  });

  // WHY: CORS 는 Function URL 측에서만 처리 (NestJS 의 helmet/CORS 와 중복 시
  // 응답 헤더 충돌). 모바일 앱은 origin 없음 → '*' 안전. 추후 web 어드민 등장 시 좁힘.
  it('CORS 활성 — allowOrigins=*', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Lambda::Url', {
      Cors: Match.objectLike({
        AllowOrigins: ['*'],
      }),
    });
  });

  it('CfnOutput 으로 Function URL 노출 — OAuth 콘솔 등록/모바일 앱 환경변수 주입', () => {
    const template = synth('dev');
    template.hasOutput('BackendApiFunctionUrl', {});
  });
});

describe('TodolistBackendStack — grantSsmRead', () => {
  // WHY: Lambda 실행 역할에 SSM 읽기 권한을 주입하는 단일 진입점.
  // 권한 부여 로직을 Stack 내부에 캡슐화해 호출부(Construct)는 grantee 만 넘기면 된다.
  it('grantee 에 ssm:GetParameter* 권한을 `/todolist/{env}/*` 경로로 한정 부여', () => {
    const template = synthWithGrant('dev');
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: [
              'ssm:DescribeParameters',
              'ssm:GetParameter',
              'ssm:GetParameterHistory',
              'ssm:GetParameters',
            ],
            Effect: 'Allow',
            Resource:
              'arn:aws:ssm:ap-northeast-2:123456789012:parameter/todolist/dev/*',
          }),
        ]),
      }),
    });
  });

  // WHY: SecureString 은 AWS-managed KMS key (`alias/aws/ssm`) 로 암호화돼 있어
  // GetParameter(WithDecryption=true) 호출 시 kms:Decrypt 권한이 별도로 필요하다.
  it('SecureString 복호화를 위해 kms:Decrypt 권한도 부여', () => {
    const template = synthWithGrant('dev');
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:Decrypt',
            Effect: 'Allow',
            Resource: 'arn:aws:kms:ap-northeast-2:123456789012:alias/aws/ssm',
          }),
        ]),
      }),
    });
  });

  it('env 가 prod 면 Resource 경로도 prod 로 격리', () => {
    const template = synthWithGrant('prod');
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Resource:
              'arn:aws:ssm:ap-northeast-2:123456789012:parameter/todolist/prod/*',
          }),
        ]),
      }),
    });
  });
});
