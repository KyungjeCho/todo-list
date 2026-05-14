# RUNBOOK — 배포

todo-list backend(NestJS Lambda) 의 평상 배포 / 수동 재배포 / 시크릿 등록·로테이션 / CDK 인프라 변경 절차. 장애 대응은 [RUNBOOK_INCIDENT.md](./RUNBOOK_INCIDENT.md) 를 참조한다.

## 0. 준비물

- AWS CLI v2 + profile `todolist-admin` (`aws configure --profile todolist-admin`, region `ap-northeast-2`, IAM 사용자 또는 root)
- `gh` CLI 로그인 (`gh auth status`)
- `openssl` (시크릿 자동 생성용)
- 리포 최신 main pull

## 1. 평상시 배포 (자동)

`main` 에 push 되면 자동 — 직접 트리거할 일 없음. PR 머지 시점이 곧 dev 배포 시점.

워크플로우 체인:
1. `backend-build` (`.github/workflows/backend-build.yml`)
   - paths filter: `backend/**` 변경분에만 트리거 (infra-only / docs-only PR 은 트리거 안 됨)
   - GitHub OIDC 로 `todolist-gha-deploy` Role assume → ECR login → Docker buildx `linux/arm64` 빌드 → tag=`<git-sha>` 로 push
2. `backend-deploy` (`.github/workflows/backend-deploy.yml`)
   - `workflow_run` 트리거로 build 성공 직후 시동
   - migrate Lambda 이미지 갱신 + sync invoke → `appliedMigrations` 응답 검사
   - api/cron Lambda `update-function-code`
   - `publish-version` + `live` alias upsert
   - `/health` smoke test (5회 재시도, 5초 간격)
   - smoke 실패 시 alias 를 이전 버전으로 자동 복귀

성공 신호:
```
$ curl https://<api-fn-url>.lambda-url.ap-northeast-2.on.aws/health
{"status":"ok","database":"connected","timestamp":"..."}
```

## 2. 수동 재배포 / 강제 재시동

코드 변경 없이 같은 SHA 를 다시 배포하고 싶을 때 (Lambda 재기동, 환경변수 reset, 워크플로우 자체 재시도):

**A. 빈 커밋 push (가장 가시적)**
```bash
git checkout main && git pull
git commit --allow-empty -m "chore: retry backend-deploy"
git push
```

**B. Actions UI 에서 workflow_dispatch**
- https://github.com/KyungjeCho/todo-list/actions/workflows/backend-build.yml
- 우상단 **Run workflow** → branch=`main` → `target_env=dev` → Run
- 빌드 완료 후 `backend-deploy` 가 `workflow_run` 으로 자동 시동

**C. 이미지/마이그레이션은 그대로, alias 만 다시 publish (드물 케이스)**
- 직접 `aws lambda publish-version` + `aws lambda update-alias` 로 처리 (deploy 워크플로우의 해당 step 로직과 동일)

## 3. SSM 시크릿 — 첫 등록

새 env 에 처음 배포할 때 한 번만 실행. 7종 SecureString 을 `/todolist/{env}/*` 경로에 등록한다.

```bash
./infra/scripts/upload-secrets.sh dev    # 또는 prod
```

진행 흐름:
- AWS 자격 / 계정 / 리전 / env 출력 후 확인 프롬프트
- `database_url>` 입력 — Supabase Transaction pooler URI (`:6543/postgres`, password 포함 완전한 형태). 입력 echo 없음
- `jwt_secret` / `jwt_refresh_secret` / `oauth_state_secret` — `openssl rand -base64 64` 자동 생성
- `apple_private_key` / `fcm_service_account_json` / `gemini_api_key` — dev 미사용이면 `DEV_PLACEHOLDER_NOT_CONFIGURED` 로 자동 채움 (Lambda 부팅에 필요, 해당 기능 실제 호출 시에만 실패)
- 끝에 `describe-parameters` 표로 7개 확인

검증:
```bash
aws ssm describe-parameters \
  --profile todolist-admin --region ap-northeast-2 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/todolist/dev/" \
  --query 'Parameters[].Name' --output table
```

## 4. SSM 시크릿 — 로테이션 / 단일 갱신

특정 시크릿 하나만 새 값으로 덮어쓰기.

```bash
# 예시: JWT 시크릿 로테이션
aws ssm put-parameter \
  --profile todolist-admin --region ap-northeast-2 \
  --name /todolist/dev/jwt_secret \
  --type SecureString --overwrite \
  --value "$(openssl rand -base64 64)"
```

Lambda 콜드스타트 마다 SSM 을 한 번 읽어 캐시하므로, 즉시 반영하려면 강제 cold start 가 필요. 가장 단순한 방법은 §2 의 수동 재배포 → `update-function-code` 가 새 컨테이너를 띄움.

`upload-secrets.sh dev` 재실행도 가능하나, 다른 6개 값에 placeholder 가 덮어 쓰이지 않도록 주의 (스크립트는 7종 모두 다시 입력받음 — 단일 갱신엔 위 단발 명령이 안전).

## 5. CDK 인프라 변경

Lambda 메모리/타임아웃, IAM 정책, EventBridge schedule, SNS/SQS, alarm threshold 등 모든 인프라 코드 변경은 CDK 로 처리.

```bash
cd infra
npm test                                           # CDK assertion 테스트 (52건)
npx cdk diff TodolistBackend-dev --profile todolist-admin   # 변경 사항 검토
npx cdk diff TodolistShared    --profile todolist-admin     # account-wide 변경이라면
npx cdk deploy TodolistBackend-dev --profile todolist-admin
```

주의:
- IAM 정책 변경이 포함되면 CDK 가 별도 승인 프롬프트를 띄움. 변경 내용을 검토 후 `y`. CI 가 아닌 수동 작업에서 `--require-approval never` 는 피한다 (실수 시 권한 폭발 위험).
- Lambda `Code.ImageUri` 는 CDK 가 placeholder 태그를 가리키므로, `cdk deploy` 가 끝나면 실제 운영 이미지로 돌리려고 deploy 워크플로우를 한 번 더 트리거할 수 있다 (§2). CDK 가 일상 배포에 끼지 않게 분리한 설계.
- ECR repository 는 외부 관리 (`ecr.Repository.fromRepositoryName`) — CDK 가 import 만 함. 첫 부트스트랩 시 1회 `aws ecr create-repository` 또는 콘솔에서 수동 생성 필요.

## 6. 첫 환경 부트스트랩 체크리스트

새 AWS 계정 / 새 env (예: `prod` 추가) 도입 시:

1. AWS CLI profile 구성 (`aws configure --profile todolist-admin`)
2. CDK bootstrap — `npx cdk bootstrap aws://<ACCOUNT>/<REGION> --profile todolist-admin` (1회)
3. ECR repository 수동 생성 — `aws ecr create-repository --repository-name todolist-backend-<env> --image-scanning-configuration scanOnPush=true --image-tag-mutability IMMUTABLE`
4. ECR 에 placeholder 이미지 1회 push (CDK Lambda 가 가리킬 대상) — `public.ecr.aws/lambda/nodejs:20` 를 base 로 tag=`placeholder` 로 push
5. `cdk deploy TodolistShared --profile todolist-admin` (OIDC Provider + Deploy Role)
6. GH Settings → Secrets and variables → Actions
   - Repository Secret: `AWS_DEPLOY_ROLE_ARN` = `arn:aws:iam::<ACCOUNT>:role/todolist-gha-deploy`
   - Environments `dev` / `prod` 생성 + env-level Variables 4종 (`AWS_REGION`, `ECR_REPO`, `LAMBDA_API_NAME`, `LAMBDA_CRON_NAME`)
7. `cdk deploy TodolistBackend-<env> --profile todolist-admin`
8. `./infra/scripts/upload-secrets.sh <env>` (§3)
9. main push 또는 workflow_dispatch 로 첫 자동 배포 (§1)
10. `/health` 200 확인

prod 추가 시:
- `prod` environment 에 required reviewer + deployment branch policy=`tags matching v*` 설정
- 첫 배포는 `git tag v0.1.0 && git push origin v0.1.0` 으로 트리거

## 7. 롤백

자동 롤백: smoke test 실패 시 deploy 워크플로우의 `Rollback alias on smoke failure` step 이 이전 alias 버전으로 자동 복귀 (첫 배포는 prev=`NONE` 이라 skip).

수동 롤백 (이미 alias 가 새 버전으로 전환됐고, 운영 중 문제 발견):
```bash
# 현재 live alias 가 가리키는 버전 확인
aws lambda get-alias \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-api-dev --name live \
  --query FunctionVersion --output text

# 직전 안정 버전으로 되돌리기
aws lambda update-alias \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-api-dev --name live \
  --function-version <PREV_VERSION>
aws lambda update-alias \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-cron-dev --name live \
  --function-version <PREV_VERSION>
```

주의 — 현재 CDK 의 Function URL 은 `apiFunction.addFunctionUrl()` 로 함수(unqualified) 에 바인딩되어 있다. 즉 `update-function-code` 가 `$LATEST` 를 덮어쓰면 URL 도 즉시 새 코드를 서빙한다. 진정한 alias-gated traffic 을 원하면 CDK 를 alias 바인딩으로 리팩토링해야 한다 (후속 과제).

실용적인 롤백: 이전 SHA 의 이미지로 직접 `update-function-code` 가 가장 확실.
```bash
aws lambda update-function-code \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-api-dev \
  --image-uri 329597158958.dkr.ecr.ap-northeast-2.amazonaws.com/todolist-backend-dev:<PREV_SHA>
```

DB 마이그레이션은 한 번 적용되면 그대로 — backward-incompatible 변경을 적용한 경우 코드만 롤백하면 schema 가 새 코드의 가정과 어긋난다. 마이그레이션은 **반드시 backward-compatible** 로 작성 (컬럼 add 는 OK, drop/rename 은 두 릴리스로 분할).

## 8. 자주 쓰는 진단 명령

```bash
# 가장 최근 Lambda 로그 10분치
aws logs tail /aws/lambda/todolist-api-dev \
  --profile todolist-admin --region ap-northeast-2 \
  --since 10m --follow

# 현재 alias / 버전
aws lambda get-alias --function-name todolist-api-dev --name live \
  --profile todolist-admin --region ap-northeast-2

# SSM 파라미터 값 확인 (KMS 복호화 — 민감 정보, 콘솔 공유 금지)
aws ssm get-parameter --name /todolist/dev/database_url \
  --with-decryption --profile todolist-admin --region ap-northeast-2 \
  --query 'Parameter.Value' --output text

# 워크플로우 상태
gh run list --branch=main --limit=5
gh run watch <run-id>
```
