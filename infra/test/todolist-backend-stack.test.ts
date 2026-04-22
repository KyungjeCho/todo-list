import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { TodolistBackendStack } from '../lib/todolist-backend-stack';

const synth = (envName: string): Template => {
  const app = new cdk.App();
  const stack = new TodolistBackendStack(app, `TodolistBackend-${envName}`, {
    envName,
  });
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
