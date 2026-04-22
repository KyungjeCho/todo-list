#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { TodolistBackendStack } from '../lib/todolist-backend-stack';

const app = new cdk.App();

// WHY: 환경별 Stack 1개. dev/prod 는 deploy 시 `--context env=dev` 로 선택.
// 계정/리전은 배포 환경의 AWS 자격증명에서 자동 추론(CDK_DEFAULT_*)한다.
const env = (app.node.tryGetContext('env') as string | undefined) ?? 'dev';

new TodolistBackendStack(app, `TodolistBackend-${env}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-2',
  },
  tags: {
    Project: 'todolist',
    Environment: env,
    ManagedBy: 'cdk',
  },
});
