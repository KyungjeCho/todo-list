import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { TodolistBackendStack } from '../lib/todolist-backend-stack';

/**
 * 스캐폴딩 스모크 테스트.
 *
 * WHY: Stack 이 합성(synth) 가능한지 확인한다. 후속 PR에서 Construct 를 추가하면
 * 리소스별 단위 테스트로 확장한다. (docs/INFRA_SPEC.md §7-2)
 */
test('TodolistBackendStack synthesizes (empty scaffold)', () => {
  const app = new cdk.App();
  const stack = new TodolistBackendStack(app, 'TestStack');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toBeDefined();
});
