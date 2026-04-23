import * as cdk from 'aws-cdk-lib/core';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { ssmParameterNames, ssmParameterPathArn } from './ssm-parameters';

/**
 * Cron 잡 정의 — `backend/src/scheduler.ts` 의 라우터(`event.job`)와 1:1 대응.
 *
 * WHY: cron 표현식/타임존을 한 곳에서 관리하고, 잡 추가 시 이 배열만 수정하면
 * Schedule 리소스가 자동 합성된다. 모든 잡은 같은 cron Lambda 를 호출하되 input
 * payload 의 `job` 필드로 분기. (docs/INFRA_SPEC.md §5.1, §5.2)
 */
const CRON_JOBS: ReadonlyArray<{
  name: string;
  job: string;
  schedule: string;
}> = [
  { name: 'daily-review-notify', job: 'daily-review-notify', schedule: 'cron(0 22 * * ? *)' },
  { name: 'carry-over-cleanup', job: 'carry-over-cleanup', schedule: 'cron(5 0 * * ? *)' },
  { name: 'fcm-token-prune', job: 'fcm-token-prune', schedule: 'cron(0 3 * * ? *)' },
];

/** Cron 표현식의 기준 타임존 — 운영팀이 KST 로 사고하므로 UTC 변환 실수 차단. */
const CRON_TIMEZONE = 'Asia/Seoul';

/**
 * Lambda 컨테이너 이미지의 placeholder 태그.
 *
 * WHY: CDK 가 Lambda 를 처음 합성할 때 ECR 에 이미지가 존재해야 한다. CI 가
 * git SHA 태그로 운영 이미지를 푸시하기 전, 운영자가 한 번만 push 해두는 부트스트랩
 * 태그. 이후 운영 배포는 `aws lambda update-function-code` 로 SHA 태그를 가리키도록
 * 변경 — `cdk deploy` 는 인프라 변경 시에만 트리거되어 image 를 placeholder 로
 * 되돌리지 않는다. (docs/INFRA_SPEC.md §7-2, RUNBOOK_DEPLOY)
 */
const PLACEHOLDER_IMAGE_TAG = 'placeholder';

/**
 * Stack props 확장 — env 식별자를 리소스 이름에 일관되게 주입한다.
 *
 * WHY: stack id 에서 env 를 파싱하면 깨지기 쉽다. 명시적 prop 으로 받는다.
 */
export interface TodolistBackendStackProps extends cdk.StackProps {
  /** 환경 식별자 ('dev' | 'prod'). 리소스 이름 suffix 로 사용. */
  envName: string;
}

/**
 * Todolist 백엔드(Lambda 컨테이너) 인프라 Stack.
 *
 * WHY: ECR / Lambda(api, cron) / Lambda Function URL / EventBridge Scheduler /
 * SSM / CloudWatch 리소스를 한 단위로 관리한다. 환경(dev/prod)별로 1개 Stack
 * 인스턴스를 생성한다. (docs/INFRA_SPEC.md §2, §7-2)
 */
export class TodolistBackendStack extends cdk.Stack {
  public readonly backendRepository: ecr.Repository;
  public readonly apiFunction: lambda.DockerImageFunction;
  public readonly cronFunction: lambda.DockerImageFunction;
  public readonly apiFunctionUrl: lambda.FunctionUrl;
  public readonly alarmTopic: sns.Topic;
  public readonly deadLetterQueue: sqs.Queue;
  private readonly envName: string;

  constructor(scope: Construct, id: string, props: TodolistBackendStackProps) {
    super(scope, id, props);

    this.envName = props.envName;
    this.backendRepository = this.createBackendRepository(props.envName);

    new cdk.CfnOutput(this, 'BackendRepositoryUri', {
      value: this.backendRepository.repositoryUri,
      description: 'Lambda 컨테이너 이미지 ECR URI (CI 에서 docker push 대상)',
    });

    this.apiFunction = this.createApiFunction(props.envName);
    this.cronFunction = this.createCronFunction(props.envName);
    this.grantSsmRead(this.apiFunction);
    this.grantSsmRead(this.cronFunction);

    this.apiFunctionUrl = this.createApiFunctionUrl();

    new cdk.CfnOutput(this, 'BackendApiFunctionUrl', {
      value: this.apiFunctionUrl.url,
      description:
        'api Lambda 의 Function URL — OAuth redirect/모바일 앱 BASE_URL',
    });

    this.alarmTopic = this.createAlarmTopic(props.envName);
    this.deadLetterQueue = this.createDeadLetterQueue(props.envName);

    this.createCronSchedules(props.envName);
    this.createAlarms(props.envName);
  }

  /**
   * Lambda 실행 역할 등 grantee 에 SSM Parameter Store 읽기 권한을 부여한다.
   *
   * WHY: SSM SecureString 시크릿은 운영자가 수동 등록하지만, 런타임에서 읽기
   * 권한은 IaC 가 일관되게 부여해야 한다. 권한 범위는 `/todolist/{env}/*` 로
   * 한정해 다른 환경/프로젝트의 시크릿 노출을 차단한다.
   *
   * - SecureString 복호화에는 KMS `alias/aws/ssm` 의 Decrypt 권한이 별도로 필요.
   * - 호출 예: `stack.grantSsmRead(apiLambda.role!)`.
   */
  public grantSsmRead(grantee: iam.IGrantable): void {
    grantee.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:DescribeParameters',
          'ssm:GetParameter',
          'ssm:GetParameterHistory',
          'ssm:GetParameters',
        ],
        resources: [ssmParameterPathArn(this.region, this.account, this.envName)],
      }),
    );
    grantee.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [
          `arn:aws:kms:${this.region}:${this.account}:alias/aws/ssm`,
        ],
      }),
    );
  }

  /**
   * Lambda env var 로 주입할 SSM 파라미터 이름 매핑.
   *
   * WHY: Lambda 환경변수에는 시크릿 **값**이 아닌 SSM **이름**만 저장한다. backend
   * 의 ssm-loader 가 콜드스타트 시 GetParameter 로 실제 값을 로드. CloudFormation
   * 템플릿/CloudWatch 로그에 시크릿이 평문 노출되는 것을 차단.
   */
  private buildSsmParamNameEnv(envName: string): Record<string, string> {
    const names = ssmParameterNames(envName);
    return {
      DATABASE_URL_PARAM: names.databaseUrl,
      JWT_SECRET_PARAM: names.jwtSecret,
      JWT_REFRESH_SECRET_PARAM: names.jwtRefreshSecret,
      OAUTH_STATE_SECRET_PARAM: names.oauthStateSecret,
      APPLE_PRIVATE_KEY_PARAM: names.applePrivateKey,
      FCM_SERVICE_ACCOUNT_JSON_PARAM: names.fcmServiceAccountJson,
      GEMINI_API_KEY_PARAM: names.geminiApiKey,
    };
  }

  /**
   * api Lambda — NestJS HTTP 핸들러.
   *
   * WHY: 사용자 요청 처리. Function URL 의 진입점. 타임아웃 짧게 잡아 비정상 응답에
   * 비용 누적 차단. 메모리는 콜드스타트 vs 단가 균형점 (512MB).
   */
  private createApiFunction(envName: string): lambda.DockerImageFunction {
    return new lambda.DockerImageFunction(this, 'ApiFunction', {
      functionName: `todolist-api-${envName}`,
      code: lambda.DockerImageCode.fromEcr(this.backendRepository, {
        tagOrDigest: PLACEHOLDER_IMAGE_TAG,
        // WHY: 단일 이미지에 두 핸들러(lambda.handler/scheduler.handler) 가 함께
        // 빌드되므로 어느 진입점을 부트스트랩할지 명시한다.
        cmd: ['dist/src/lambda.handler'],
      }),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
        ...this.buildSsmParamNameEnv(envName),
      },
    });
  }

  /**
   * cron Lambda — EventBridge Scheduler 가 트리거하는 배치 핸들러.
   *
   * WHY: 일일 알림/통계 등 장시간 실행 가능한 배치 작업. 타임아웃 5분, 메모리는
   * 동시 다건 처리 여유 위해 1024MB. 외부 노출 불필요 → Function URL 없음.
   *
   * `reservedConcurrentExecutions: 1` — cron 잡 중복 실행 방지(§5.3). 같은 잡이
   * 두 번 동시에 돌면서 DB/외부 API 호출이 중복되는 사고 차단.
   */
  private createCronFunction(envName: string): lambda.DockerImageFunction {
    return new lambda.DockerImageFunction(this, 'CronFunction', {
      functionName: `todolist-cron-${envName}`,
      code: lambda.DockerImageCode.fromEcr(this.backendRepository, {
        tagOrDigest: PLACEHOLDER_IMAGE_TAG,
        // WHY: cron 핸들러는 NestApplicationContext 만 띄우는 별도 엔트리.
        // CMD 미지정 시 Dockerfile 의 기본(api 핸들러)이 적용돼 cron Lambda 가
        // HTTP 서버를 띄우는 사고 발생.
        cmd: ['dist/src/scheduler.handler'],
      }),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(300),
      reservedConcurrentExecutions: 1,
      environment: {
        NODE_ENV: 'production',
        ...this.buildSsmParamNameEnv(envName),
      },
    });
  }

  /**
   * EventBridge Scheduler 3종 + 공유 IAM Role + Schedule Group.
   *
   * WHY: 잡들을 한 그룹(`todolist-{env}`)에 모아 콘솔/CW 메트릭에서 그룹 단위
   * 가시성을 확보. cron Lambda 1개를 공유하되 input payload 의 `job` 필드로
   * 핸들러 분기. Scheduler 가 Lambda 를 호출하려면 별도 IAM Role 필요
   * (Scheduler 서비스 principal 가 assume).
   */
  private createCronSchedules(envName: string): void {
    const group = new scheduler.CfnScheduleGroup(this, 'CronScheduleGroup', {
      name: `todolist-${envName}`,
    });

    const schedulerRole = new iam.Role(this, 'CronSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'EventBridge Scheduler role for invoking cron Lambda',
    });
    this.cronFunction.grantInvoke(schedulerRole);

    // WHY: Scheduler 가 DLQ 에 메시지를 쓰려면 별도 권한 필요. Role 에 부여.
    this.deadLetterQueue.grantSendMessages(schedulerRole);

    for (const { name, job, schedule } of CRON_JOBS) {
      new scheduler.CfnSchedule(this, `CronSchedule-${name}`, {
        name: `todolist-${name}-${envName}`,
        groupName: group.name,
        scheduleExpression: schedule,
        scheduleExpressionTimezone: CRON_TIMEZONE,
        flexibleTimeWindow: { mode: 'OFF' },
        target: {
          arn: this.cronFunction.functionArn,
          roleArn: schedulerRole.roleArn,
          input: JSON.stringify({ job }),
          deadLetterConfig: {
            arn: this.deadLetterQueue.queueArn,
          },
        },
      });
    }
  }

  /**
   * 알람 액션을 모으는 SNS Topic.
   *
   * WHY: 6개 알람이 동일 Topic 으로 라우팅되어 subscription(이메일/Slack/Telegram)
   * 1번 추가로 전체 커버. 채널 변경이 잦아도 인프라 PR 불필요 — 운영자가
   * RUNBOOK 절차로 SNS subscription 추가/제거.
   */
  private createAlarmTopic(envName: string): sns.Topic {
    return new sns.Topic(this, 'AlarmTopic', {
      topicName: `todolist-alarms-${envName}`,
      displayName: `Todolist Alarms (${envName})`,
    });
  }

  /**
   * EventBridge Scheduler 호출 실패 메시지를 보존하는 SQS DLQ.
   *
   * WHY: Scheduler 가 cron Lambda 호출 자체에 실패한 경우(throttle, IAM,
   * network) 의 페이로드를 보존해 디버깅. 14일 보존(SQS 최대치) — 주말/연휴에
   * 발생해도 탐지 가능.
   */
  private createDeadLetterQueue(envName: string): sqs.Queue {
    return new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `todolist-dlq-${envName}`,
      retentionPeriod: cdk.Duration.days(14),
    });
  }

  /**
   * §6.2 정의 알람 6종 — 모두 `alarmTopic` 으로 라우팅.
   *
   * WHY: 운영 신호의 최소 집합. Lambda Errors/Duration/Throttles + DLQ 누적.
   * api 는 사용자 영향이라 Errors/Duration, cron 은 잡 누락 방지로 Throttles
   * 추가. TreatMissingData 는 NOT_BREACHING(데이터 없으면 OK) — 긴 idle 구간
   * 잘못된 알람 방지.
   */
  private createAlarms(envName: string): void {
    const action = new cwActions.SnsAction(this.alarmTopic);
    const apiName = `todolist-api-${envName}`;
    const cronName = `todolist-cron-${envName}`;

    const errorAlarm = (
      id: string,
      fn: lambda.IFunction,
      fnName: string,
    ): cloudwatch.Alarm =>
      new cloudwatch.Alarm(this, id, {
        alarmName: `${fnName}-errors`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(1),
          statistic: cloudwatch.Stats.SUM,
        }),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: '분당 에러 5건 이상 — 장애 신호',
      });

    const durationAlarm = (
      id: string,
      fn: lambda.IFunction,
      fnName: string,
    ): cloudwatch.Alarm =>
      new cloudwatch.Alarm(this, id, {
        alarmName: `${fnName}-duration-p95`,
        metric: fn.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: cloudwatch.Stats.percentile(95),
        }),
        threshold: 3000,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'p95 지연 3초 초과 — 사용자 체감 영향',
      });

    const alarms: cloudwatch.Alarm[] = [
      errorAlarm('ApiErrorsAlarm', this.apiFunction, apiName),
      durationAlarm('ApiDurationP95Alarm', this.apiFunction, apiName),
      errorAlarm('CronErrorsAlarm', this.cronFunction, cronName),
      new cloudwatch.Alarm(this, 'CronThrottlesAlarm', {
        alarmName: `${cronName}-throttles`,
        metric: this.cronFunction.metricThrottles({
          period: cdk.Duration.minutes(1),
          statistic: cloudwatch.Stats.SUM,
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription:
          'cron throttle = 잡 누락 (reservedConcurrency=1 환경)',
      }),
      durationAlarm('CronDurationP95Alarm', this.cronFunction, cronName),
      new cloudwatch.Alarm(this, 'DlqMessagesAlarm', {
        alarmName: `todolist-dlq-${envName}-messages`,
        metric: this.deadLetterQueue.metricApproximateNumberOfMessagesVisible({
          period: cdk.Duration.minutes(1),
          statistic: cloudwatch.Stats.MAXIMUM,
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'DLQ 누적 = Scheduler→Lambda 호출 실패 누적',
      }),
    ];

    for (const alarm of alarms) {
      alarm.addAlarmAction(action);
    }
  }

  /**
   * api Lambda 의 Function URL — API Gateway 미사용.
   *
   * WHY: 도메인 미보유 + 초기 트래픽 0. AuthType=NONE 으로 공개하고 인증은
   * NestJS JWT 가드가 담당. CORS 는 Function URL 측에서만 처리(NestJS helmet/
   * CORS 와 헤더 중복 회피). 모바일 앱은 origin 없음 → '*' 안전. 추후 web
   * 어드민 등장 시 좁힘.
   */
  private createApiFunctionUrl(): lambda.FunctionUrl {
    return this.apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
        maxAge: cdk.Duration.hours(1),
      },
    });
  }

  /**
   * Lambda 컨테이너 이미지 보관용 ECR Repository.
   *
   * WHY: env 별 격리(dev 이미지가 prod 에 섞이지 않음), IMMUTABLE 태그로 동일
   * SHA 재푸시 차단, scan-on-push 로 CVE 자동 검출, RETAIN 으로 destroy 사고
   * 방지, lifecycle 로 스토리지 비용 누적 차단. (docs/INFRA_SPEC.md §7-2)
   */
  private createBackendRepository(envName: string): ecr.Repository {
    return new ecr.Repository(this, 'BackendRepository', {
      repositoryName: `todolist-backend-${envName}`,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          maxImageCount: 20,
          description: '최신 20개 이미지만 보존 — 스토리지 비용 누적 차단',
        },
      ],
    });
  }
}
