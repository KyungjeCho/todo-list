import * as cdk from 'aws-cdk-lib/core';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ssmParameterNames, ssmParameterPathArn } from './ssm-parameters';

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
   */
  private createCronFunction(envName: string): lambda.DockerImageFunction {
    return new lambda.DockerImageFunction(this, 'CronFunction', {
      functionName: `todolist-cron-${envName}`,
      code: lambda.DockerImageCode.fromEcr(this.backendRepository, {
        tagOrDigest: PLACEHOLDER_IMAGE_TAG,
      }),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(300),
      environment: {
        NODE_ENV: 'production',
        ...this.buildSsmParamNameEnv(envName),
      },
    });
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
