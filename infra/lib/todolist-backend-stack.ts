import * as cdk from 'aws-cdk-lib/core';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ssmParameterPathArn } from './ssm-parameters';

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
  private readonly envName: string;

  constructor(scope: Construct, id: string, props: TodolistBackendStackProps) {
    super(scope, id, props);

    this.envName = props.envName;
    this.backendRepository = this.createBackendRepository(props.envName);

    new cdk.CfnOutput(this, 'BackendRepositoryUri', {
      value: this.backendRepository.repositoryUri,
      description: 'Lambda 컨테이너 이미지 ECR URI (CI 에서 docker push 대상)',
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
