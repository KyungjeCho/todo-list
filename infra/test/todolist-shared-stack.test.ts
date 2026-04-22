import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { TodolistSharedStack } from '../lib/todolist-shared-stack';

const synth = (): Template => {
  const app = new cdk.App();
  const stack = new TodolistSharedStack(app, 'TodolistShared');
  return Template.fromStack(stack);
};

describe('TodolistSharedStack', () => {
  describe('GitHub OIDC Provider', () => {
    // WHY: AWS 계정당 OIDC URL 기준 1개만 존재 가능. Shared Stack 에서 단일 생성.
    it('GitHub Actions URL/audience 로 1개 생성', () => {
      const template = synth();
      template.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
      template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        Url: 'https://token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
      });
    });
  });

  describe('Deploy Role', () => {
    it('roleName=todolist-gha-deploy — GH Actions 가 Assume 하는 단일 진입점', () => {
      const template = synth();
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'todolist-gha-deploy',
      });
    });

    // WHY: 단기 자격증명 강제. 1시간 이내에 Assume 갱신해야 하므로 토큰 노출 위험 ↓.
    it('MaxSessionDuration=3600 (1시간)', () => {
      const template = synth();
      template.hasResourceProperties('AWS::IAM::Role', {
        MaxSessionDuration: 3600,
      });
    });

    // WHY: 신뢰 정책으로 우리 리포(KyungjeCho/todo-list)의 main 브랜치 + v* 태그
    // 워크플로우만 Role 을 Assume 할 수 있도록 제한. fork PR 의 Assume 차단.
    it('Assume 조건: KyungjeCho/todo-list main 브랜치 + v* 태그만 허용', () => {
      const template = synth();
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: {
                StringEquals: {
                  'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                },
                StringLike: {
                  'token.actions.githubusercontent.com:sub': [
                    'repo:KyungjeCho/todo-list:ref:refs/heads/main',
                    'repo:KyungjeCho/todo-list:ref:refs/tags/v*',
                  ],
                },
              },
            }),
          ]),
        }),
      });
    });

    // WHY: ecr:GetAuthorizationToken 은 AWS 사양상 리소스 지정이 불가능(account-wide).
    it('ecr:GetAuthorizationToken 권한은 Resource=*', () => {
      const template = synth();
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'ecr:GetAuthorizationToken',
              Resource: '*',
            }),
          ]),
        }),
      });
    });

    // WHY: 우리가 관리하는 todolist-backend-* 리포지토리 외에는 push 금지.
    // Resource 는 ${this.region}/${this.account} 보간으로 Fn::Join intrinsic 가 되므로
    // arrayWith + stringLikeRegexp 로 마지막 segment("repository/todolist-backend-*") 검증.
    it('ECR push 권한은 todolist-backend-* 리포지토리에만 한정', () => {
      const template = synth();
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'ecr:BatchCheckLayerAvailability',
                'ecr:CompleteLayerUpload',
                'ecr:InitiateLayerUpload',
                'ecr:PutImage',
                'ecr:UploadLayerPart',
              ]),
              Resource: {
                'Fn::Join': [
                  '',
                  Match.arrayWith([':repository/todolist-backend-*']),
                ],
              },
            }),
          ]),
        }),
      });
    });
  });

  describe('CfnOutput', () => {
    it('DeployRoleArn — GH Secrets `AWS_DEPLOY_ROLE_ARN` 에 등록', () => {
      const template = synth();
      template.hasOutput('DeployRoleArn', {});
    });
  });
});
