import * as cdk from 'aws-cdk-lib/core';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

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

  constructor(scope: Construct, id: string, props: TodolistBackendStackProps) {
    super(scope, id, props);

    this.backendRepository = this.createBackendRepository(props.envName);

    new cdk.CfnOutput(this, 'BackendRepositoryUri', {
      value: this.backendRepository.repositoryUri,
      description: 'Lambda 컨테이너 이미지 ECR URI (CI 에서 docker push 대상)',
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
