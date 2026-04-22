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

describe('TodolistBackendStack — EventBridge Scheduler (cron 3종)', () => {
  // WHY: 3개 잡(일일 회고/이월 정리/FCM 토큰 만료)을 한 그룹에 묶어 CW 메트릭/콘솔
  // 가시성을 그룹 단위로 본다. env 별 격리(`todolist-dev` vs `todolist-prod`).
  it('Schedule Group 1개 — `todolist-{env}` 이름', () => {
    const template = synth('dev');
    template.resourceCountIs('AWS::Scheduler::ScheduleGroup', 1);
    template.hasResourceProperties('AWS::Scheduler::ScheduleGroup', {
      Name: 'todolist-dev',
    });
  });

  it('Schedule 3개 생성 — daily-review-notify / carry-over-cleanup / fcm-token-prune', () => {
    const template = synth('dev');
    template.resourceCountIs('AWS::Scheduler::Schedule', 3);
  });

  // WHY: KST 기준 운영 시간(밤 10시 회고, 새벽 0시 5분 이월, 새벽 3시 FCM 정리).
  // EventBridge Scheduler 는 timezone 네이티브 지원 — UTC 변환 실수 방지.
  it('일일 회고 알림: cron(0 22 * * ? *) Asia/Seoul + job=daily-review-notify', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Scheduler::Schedule', {
      Name: 'todolist-daily-review-notify-dev',
      ScheduleExpression: 'cron(0 22 * * ? *)',
      ScheduleExpressionTimezone: 'Asia/Seoul',
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: Match.objectLike({
        Input: JSON.stringify({ job: 'daily-review-notify' }),
      }),
    });
  });

  it('이월 정리: cron(5 0 * * ? *) Asia/Seoul + job=carry-over-cleanup', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Scheduler::Schedule', {
      Name: 'todolist-carry-over-cleanup-dev',
      ScheduleExpression: 'cron(5 0 * * ? *)',
      ScheduleExpressionTimezone: 'Asia/Seoul',
      Target: Match.objectLike({
        Input: JSON.stringify({ job: 'carry-over-cleanup' }),
      }),
    });
  });

  it('FCM 토큰 정리: cron(0 3 * * ? *) Asia/Seoul + job=fcm-token-prune', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Scheduler::Schedule', {
      Name: 'todolist-fcm-token-prune-dev',
      ScheduleExpression: 'cron(0 3 * * ? *)',
      ScheduleExpressionTimezone: 'Asia/Seoul',
      Target: Match.objectLike({
        Input: JSON.stringify({ job: 'fcm-token-prune' }),
      }),
    });
  });

  // WHY: Scheduler 가 Lambda 를 호출하려면 별도 IAM Role 필요 (Scheduler 서비스
  // principal). 3개 Schedule 이 동일 Role 공유 — Lambda 1개만 InvokeFunction 권한.
  it('Scheduler 전용 Role — scheduler.amazonaws.com 가 assume', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: { Service: 'scheduler.amazonaws.com' },
          }),
        ]),
      }),
    });
  });

  it('Scheduler Role 은 cron Lambda InvokeFunction 권한만 보유', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'lambda:InvokeFunction',
            Effect: 'Allow',
            Resource: Match.anyValue(),
          }),
        ]),
      }),
    });
  });

  // WHY: cron 잡 중복 실행 방지 (§5.3). 동시 실행 1로 제한해 같은 잡이 두 번
  // 동시에 돌면서 DB 갱신 충돌·중복 알림 발송하는 사고 차단.
  it('cron Lambda 는 ReservedConcurrentExecutions=1', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'todolist-cron-dev',
      ReservedConcurrentExecutions: 1,
    });
  });

  // WHY: api Lambda 는 동시성 제한하면 트래픽 폭증 시 throttle 됨.
  // cron 만 제한하고 api 는 Lambda account-wide 한도 (1000) 사용.
  it('api Lambda 는 ReservedConcurrentExecutions 미설정', () => {
    const template = synth('dev');
    const apis = template.findResources('AWS::Lambda::Function', {
      Properties: { FunctionName: 'todolist-api-dev' },
    });
    const apiProps = Object.values(apis)[0].Properties as {
      ReservedConcurrentExecutions?: number;
    };
    expect(apiProps.ReservedConcurrentExecutions).toBeUndefined();
  });
});

describe('TodolistBackendStack — DLQ + 알람 SNS Topic', () => {
  // WHY: 알람 액션을 SNS Topic 1개로 모아 subscription(이메일/webhook) 을
  // 운영자가 RUNBOOK 으로 추가/제거. CDK 는 채널 자체는 정의하지 않음 — 채널
  // 변경이 잦아도 인프라 변경 PR 이 필요 없게 한다.
  it('SNS Topic `todolist-alarms-{env}` 1개', () => {
    const template = synth('dev');
    template.resourceCountIs('AWS::SNS::Topic', 1);
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'todolist-alarms-dev',
    });
  });

  // WHY: cron 잡 실패 시 메시지 보존 → 디버깅 14일 유예.
  it('SQS DLQ `todolist-dlq-{env}` — MessageRetentionPeriod=14d', () => {
    const template = synth('dev');
    template.resourceCountIs('AWS::SQS::Queue', 1);
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'todolist-dlq-dev',
      MessageRetentionPeriod: 1209600,
    });
  });

  // WHY: EventBridge Scheduler 가 cron Lambda 호출 자체에 실패한 경우(throttle,
  // permission, network) 의 메시지를 DLQ 로 보존. Lambda 내부 예외와는 별개 경로.
  it('EventBridge Schedule 3개 모두 DeadLetterConfig 로 DLQ 연결', () => {
    const template = synth('dev');
    const schedules = template.findResources('AWS::Scheduler::Schedule');
    const entries = Object.values(schedules);
    expect(entries.length).toBe(3);
    for (const entry of entries) {
      const target = (entry.Properties as { Target: { DeadLetterConfig?: unknown } })
        .Target;
      expect(target.DeadLetterConfig).toBeDefined();
    }
  });
});

describe('TodolistBackendStack — CloudWatch 알람', () => {
  // WHY: §6.2 임계 — 분당 5개 이상 에러는 단순 일회성이 아닌 장애 신호.
  // Dimensions.Value 는 Lambda logical-id 의 Ref intrinsic 로 합성됨.
  it('api Lambda Errors ≥ 5/1min', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'todolist-api-dev-errors',
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      Statistic: 'Sum',
      Period: 60,
      EvaluationPeriods: 1,
      Threshold: 5,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Dimensions: Match.arrayWith([
        Match.objectLike({
          Name: 'FunctionName',
          Value: { Ref: Match.stringLikeRegexp('^ApiFunction') },
        }),
      ]),
    });
  });

  // WHY: p95 가 3초 넘으면 사용자 체감 지연. 모바일 retry/타임아웃 비용도 증가.
  it('api Lambda Duration p95 ≥ 3000ms', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'todolist-api-dev-duration-p95',
      Namespace: 'AWS/Lambda',
      MetricName: 'Duration',
      ExtendedStatistic: 'p95',
      Threshold: 3000,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Dimensions: Match.arrayWith([
        Match.objectLike({
          Name: 'FunctionName',
          Value: { Ref: Match.stringLikeRegexp('^ApiFunction') },
        }),
      ]),
    });
  });

  it('cron Lambda Errors ≥ 5/1min', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'todolist-cron-dev-errors',
      MetricName: 'Errors',
      Threshold: 5,
      Dimensions: Match.arrayWith([
        Match.objectLike({
          Name: 'FunctionName',
          Value: { Ref: Match.stringLikeRegexp('^CronFunction') },
        }),
      ]),
    });
  });

  // WHY: cron 은 reserved=1 이라 throttle 발생 = 잡 자체가 누락. 즉시 신호.
  it('cron Lambda Throttles ≥ 1', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'todolist-cron-dev-throttles',
      MetricName: 'Throttles',
      Threshold: 1,
      Dimensions: Match.arrayWith([
        Match.objectLike({
          Name: 'FunctionName',
          Value: { Ref: Match.stringLikeRegexp('^CronFunction') },
        }),
      ]),
    });
  });

  it('cron Lambda Duration p95 ≥ 3000ms', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'todolist-cron-dev-duration-p95',
      MetricName: 'Duration',
      ExtendedStatistic: 'p95',
      Threshold: 3000,
      Dimensions: Match.arrayWith([
        Match.objectLike({
          Name: 'FunctionName',
          Value: { Ref: Match.stringLikeRegexp('^CronFunction') },
        }),
      ]),
    });
  });

  // WHY: DLQ 에 메시지가 쌓였다는 것 자체가 호출 실패 누적 신호. 수치 무관 즉시 알림.
  it('DLQ 메시지 누적 ≥ 1 알람', () => {
    const template = synth('dev');
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'todolist-dlq-dev-messages',
      Namespace: 'AWS/SQS',
      MetricName: 'ApproximateNumberOfMessagesVisible',
      Threshold: 1,
      Dimensions: Match.arrayWith([
        Match.objectLike({
          Name: 'QueueName',
          Value: Match.objectLike({
            'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('^DeadLetterQueue')]),
          }),
        }),
      ]),
    });
  });

  // WHY: 6개 알람 모두 동일 SNS Topic 으로 라우팅 → subscription 1번 추가로 전체 커버.
  it('모든 알람이 SNS Topic 으로 AlarmAction 설정 (6개)', () => {
    const template = synth('dev');
    const alarms = template.findResources('AWS::CloudWatch::Alarm');
    const entries = Object.values(alarms);
    expect(entries.length).toBe(6);
    for (const entry of entries) {
      const props = entry.Properties as { AlarmActions?: unknown[] };
      expect(props.AlarmActions).toBeDefined();
      expect(props.AlarmActions!.length).toBe(1);
    }
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
