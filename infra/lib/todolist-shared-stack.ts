import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

const GITHUB_REPO = 'KyungjeCho/todo-list';
const GITHUB_OIDC_URL = 'https://token.actions.githubusercontent.com';
const GITHUB_OIDC_AUDIENCE = 'sts.amazonaws.com';

/**
 * 환경 공유(account-wide) 인프라 Stack — 1회만 배포한다.
 *
 * WHY: GitHub Actions OIDC Provider 는 AWS 계정당 URL 기준 1개만 존재 가능하고
 * (env 별 분리 불가), Deploy Role 은 dev/prod 양 환경의 ECR/Lambda/SSM 을 모두
 * 다루는 단일 진입점이므로 환경 무관하게 1개만 둔다. (docs/INFRA_SPEC.md §3, §7-2)
 */
export class TodolistSharedStack extends cdk.Stack {
  public readonly githubOidcProvider: iam.OpenIdConnectProvider;
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.githubOidcProvider = new iam.OpenIdConnectProvider(
      this,
      'GitHubOidcProvider',
      {
        url: GITHUB_OIDC_URL,
        clientIds: [GITHUB_OIDC_AUDIENCE],
      },
    );

    this.deployRole = this.createDeployRole();

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      description:
        'GH Actions OIDC Deploy Role ARN — GH Secrets `AWS_DEPLOY_ROLE_ARN` 에 등록',
    });
  }

  /**
   * GitHub Actions 가 OIDC 로 Assume 하는 단일 배포 Role.
   *
   * WHY: 신뢰 정책으로 우리 리포의 main 브랜치 + v* 태그 워크플로우에서만 Assume
   * 가능하도록 제한. fork PR 의 임의 코드가 Role 을 탈취하는 것을 차단한다.
   * 권한은 ECR push 부터 시작, Lambda/SSM 권한은 후속 Construct PR 에서 확장.
   * (docs/INFRA_SPEC.md §3.4)
   */
  private createDeployRole(): iam.Role {
    const principal = new iam.OpenIdConnectPrincipal(this.githubOidcProvider, {
      StringEquals: {
        'token.actions.githubusercontent.com:aud': GITHUB_OIDC_AUDIENCE,
      },
      StringLike: {
        'token.actions.githubusercontent.com:sub': [
          `repo:${GITHUB_REPO}:ref:refs/heads/main`,
          `repo:${GITHUB_REPO}:ref:refs/tags/v*`,
        ],
      },
    });

    const role = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: 'todolist-gha-deploy',
      assumedBy: principal,
      description:
        'GitHub Actions OIDC Deploy Role - ECR push / (later) Lambda update / SSM read',
      // WHY: 단기 자격증명 강제. 장기 토큰 노출 위험을 줄이기 위해 1시간 상한.
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // ECR 인증 토큰 발급 — AWS 사양상 리소스 지정 불가(account-wide).
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      }),
    );

    // ECR push — 우리가 관리하는 todolist-backend-* 리포지토리 한정.
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:CompleteLayerUpload',
          'ecr:InitiateLayerUpload',
          'ecr:PutImage',
          'ecr:UploadLayerPart',
          'ecr:BatchGetImage',
        ],
        resources: [
          `arn:aws:ecr:${this.region}:${this.account}:repository/todolist-backend-*`,
        ],
      }),
    );

    // Lambda 배포 — api/cron/migrate 3종 Lambda 에 한정.
    // WHY: GH Actions 의 backend-deploy.yml 이 update-function-code →
    //      publish-version → update-alias 순으로 호출. GetFunctionUrlConfig 는
    //      smoke test 가 Function URL 을 조회하기 위함. InvokeFunction 은
    //      migration Lambda 를 deploy 파이프라인 선행 단계에서 호출하기 위함.
    // 리소스 네이밍(`todolist-{api,cron,migrate}-*`) 은 TodolistBackendStack 의
    // Lambda functionName 과 1:1 정합. 다른 env/프로젝트 Lambda 에 대한 접근 차단.
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:UpdateFunctionCode',
          'lambda:PublishVersion',
          'lambda:UpdateAlias',
          'lambda:CreateAlias',
          'lambda:GetAlias',
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:GetFunctionUrlConfig',
          'lambda:InvokeFunction',
        ],
        resources: [
          `arn:aws:lambda:*:${this.account}:function:todolist-api-*`,
          `arn:aws:lambda:*:${this.account}:function:todolist-cron-*`,
          `arn:aws:lambda:*:${this.account}:function:todolist-migrate-*`,
        ],
      }),
    );

    return role;
  }
}
