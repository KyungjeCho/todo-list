import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

/**
 * Todolist 백엔드(Lambda 컨테이너) 인프라 Stack.
 *
 * WHY: ECR / Lambda(api, cron) / Lambda Function URL / EventBridge Scheduler /
 * SSM / CloudWatch 리소스를 한 단위로 관리한다. 환경(dev/prod)별로 1개 Stack
 * 인스턴스를 생성한다. (docs/INFRA_SPEC.md §2, §7-2)
 */
export class TodolistBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 리소스 정의는 후속 PR에서 추가 (§7-2 체크리스트).
  }
}
