# Infrastructure Spec — Backend 배포 / CI/CD

> 작성일: 2026-04-21
> 범위: Backend(NestJS) 서버리스 배포, 스케줄러(Cron), CI/CD, Secret 관리
> 대응 문서: `docs/ARCHITECTURE_DIAGRAM.md` (상위 개요), `docs/TECH_SPEC.md`

---

## 1. 목표와 원칙

- **서버리스 우선**: 상시 인스턴스 없이 Lambda(컨테이너 이미지)로 운영 → 유휴 비용 최소화.
- **단일 이미지, 다중 핸들러**: HTTP API용 Lambda와 Cron용 Lambda가 **같은 Docker 이미지**를 공유하되 핸들러만 분리(콜드스타트/동시성 경계를 분리).
- **GH OIDC 기반 무자격증 배포**: AWS 장기 Access Key를 GH에 저장하지 않는다.
- **환경 분리**: 초기에는 `dev=로컬 Docker Postgres` / `prod=Supabase Free` 2환경으로 시작(근거: 섹션 8-⑥). Supabase Pro 승격 시 `stg` 추가. Prod는 수동 승인 게이트 필수.
- **롤백 1분 내**: Lambda alias 전환으로 이전 버전 복귀. 이미지 재빌드 금지.
- **민감값 금지 로깅**: Apple Private Key, FCM Service Account, DB URL, JWT Secret 등은 로그에 노출 불가 (CLAUDE.md FCM 규칙 준수).

---

## 2. 아키텍처 — 배포 단위 기준

```
┌──────────────────────────── AWS Account ────────────────────────────┐
│                                                                     │
│   ┌─── ECR: todolist-backend ───┐                                   │
│   │  tag: <git-sha>, <semver>    │                                   │
│   └────────┬─────────────────────┘                                   │
│            │ pull (image URI)                                        │
│   ┌────────▼──────────────────┐    ┌──────────────────────────┐     │
│   │ Lambda: todolist-api      │    │ Lambda: todolist-cron    │     │
│   │  handler: dist/lambda     │    │  handler: dist/scheduler │     │
│   │  alias: dev / stg / live  │    │  alias: dev / stg / live │     │
│   │  memory: 1024MB, arm64    │    │  memory: 512MB, arm64    │     │
│   └────────┬──────────────────┘    └─────────┬────────────────┘     │
│            │                                  │                      │
│   ┌────────▼──────────┐         ┌────────────▼──────────────────┐   │
│   │ Lambda Function URL│        │ EventBridge Scheduler         │   │
│   │  HTTPS, AuthType=NONE│       │  cron(0 9 * * ? *) Asia/Seoul │   │
│   └────────┬──────────┘         └────────────────────────────────┘   │
│            │                                                         │
│   ┌────────▼──────────────────────────────────────────────────────┐  │
│   │ SSM Parameter Store (/todolist/<env>/*)                       │  │
│   │  DB_URL, JWT_SECRET, APPLE_PRIVATE_KEY, FCM_SA_JSON …         │  │
│   └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   CloudWatch Logs + Metrics (errors, duration, coldstart)            │
└─────────────────────────────────────────────────────────────────────┘
                    │                             │
                    │ TLS 5432 (pooler 6543)      │ HTTPS
                    ▼                             ▼
           ┌──────────────────┐         ┌──────────────────┐
           │ Supabase Postgres│         │ FCM / Apple /    │
           │ (ap-northeast-2) │         │ Google OAuth     │
           └──────────────────┘         └──────────────────┘
```

### 2.1 구성 결정

| 항목 | 선택 | 근거 |
|---|---|---|
| Runtime | **Lambda Container Image** (nodejs:20, arm64) | 기존 `backend/Dockerfile` 그대로 활용, ZIP 크기 250MB 제한 회피, arm64로 20% 비용 절감 |
| Gateway | **Lambda Function URL** (당분간) | HTTPS 자동, **요청당 과금 없음**(API Gateway 대비 $1/M 절감), 도메인 불필요. 추후 트래픽/도메인 필요 시 CloudFront + ACM 전환 (§8-②) |
| DB 커넥션 | **Supabase Pooler (port 6543, transaction mode) + TLS 필수** | Lambda 동시성 × 풀 크기 폭주 방지. 앱은 `extra.max=1` 유지. Supabase는 SSL 강제 |
| Cron | **EventBridge Scheduler** (not Rule) | timezone 네이티브 지원, flex 윈도우, 단일 리소스로 수백 잡 |
| Secret | **SSM Parameter Store (SecureString)** | Secrets Manager 대비 저렴, Lambda 확장으로 캐시 가능 |
| 리전 | **ap-northeast-2 (Seoul)** | 사용자/Supabase 리전 근접 |

---

## 3. Secret 관리 정책

### 3.1 저장소 계층
| 종류 | 위치 | 예시 |
|---|---|---|
| 배포 전용 자격증명 | GH Secrets (OIDC Role ARN만) | `AWS_DEPLOY_ROLE_ARN` |
| 런타임 시크릿 | AWS SSM `/todolist/<env>/*` | `DB_URL`, `JWT_SECRET`, `APPLE_PRIVATE_KEY`, `FCM_SERVICE_ACCOUNT_JSON` |
| 환경별 평문 설정 | GH Variables + Lambda env | `AWS_REGION`, `CORS_ORIGIN`, `APPLE_CLIENT_ID` |

### 3.2 Lambda 런타임 주입
- Lambda 환경변수에는 **SSM 파라미터 이름만** 저장 (`DB_URL_PARAM=/todolist/prod/db_url`).
- 부트스트랩 시 1회 SSM GetParametersByPath로 로드 → `process.env` 주입 → `bootstrap()` 실행.
- 콜드스타트에서만 수행(캐시). SSM 호출 실패 시 즉시 종료 → Lambda 재시도 또는 alias 롤백.

### 3.3 GH Secrets / Variables 목록 (최소)

CDK 가 env-suffix 로 리소스를 분리(`todolist-backend-{env}` 등)하므로 **Variable 은 Environment-level 로 분리**해 저장한다. 워크플로우 job 에 `environment: <env>` 만 선언하면 `${{ vars.X }}` 가 해당 env 값으로 자동 치환되어 문자열 조립이나 분기 로직 없이 두 환경을 처리할 수 있다. Secret 은 Role ARN 1개로 dev/prod 공통(단일 Deploy Role), Repository-level 로 저장한다.

#### Repository-level Secret
| 이름 | 유형 | 용도 |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | Secret | OIDC Deploy Role ARN (`arn:aws:iam::<acct>:role/todolist-gha-deploy`, CDK `TodolistShared` 출력) |

#### Environment-level Variables (env 별 동일 키, 값만 상이)
| 이름 | `dev` 값 | `prod` 값 | 근거 |
|---|---|---|---|
| `AWS_REGION` | `ap-northeast-2` | `ap-northeast-2` | 당분간 동일. prod 가 CloudFront+ACM 도입 시 us-east-1 인증서는 별도 변수화 검토 |
| `ECR_REPO` | `todolist-backend-dev` | `todolist-backend-prod` | `todolist-backend-stack.ts:398` |
| `LAMBDA_API_NAME` | `todolist-api-dev` | `todolist-api-prod` | `todolist-backend-stack.ts:163` |
| `LAMBDA_CRON_NAME` | `todolist-cron-dev` | `todolist-cron-prod` | `todolist-backend-stack.ts:191` |

> ❌ 금지: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, DB URL, Apple Private Key 등을 GH Secrets에 직접 저장.

### 3.4 OIDC 신뢰 정책
```jsonc
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::<acct>:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub":
        "repo:KyungjeCho/todo-list:ref:refs/heads/main"
    }
  }
}
```

IAM Role 권한은 **ECR push + Lambda update + SSM read** 로만 제한한다. Secrets Manager/Parameter Store 쓰기 권한은 부여하지 않는다(별도 one-shot 스크립트로만 갱신).

---

## 4. CI/CD 워크플로우

### 4.1 파이프라인 개요

```
PR open ──▶ backend-ci.yml        (lint + test)        필수 통과
              │
 main merge ─▶ backend-build.yml   (Docker → ECR)      tag=<git-sha>
              │
 tag v*     ─▶ backend-deploy.yml  (Lambda update)     dev → stg → prod
              │
              └▶ (success)  EventBridge alias 유지, CloudWatch 알람 확인
```

### 4.2 워크플로우 파일 (신규)

| 파일 | 트리거 | 책임 |
|---|---|---|
| `.github/workflows/backend-ci.yml` (기존) | PR, feature push | lint, unit, integration (Postgres service) |
| `.github/workflows/backend-build.yml` (신규) | `main` push, tag `v*` | Docker buildx(arm64) → ECR push, 이미지 URI 출력 |
| `.github/workflows/backend-deploy.yml` (신규) | tag `v*`, `workflow_dispatch` | Lambda `update-function-code` → `publish-version` → alias 전환 → smoke test |
| `.github/workflows/backend-scheduler-sync.yml` (신규, 선택) | 배포 후 호출 | EventBridge 규칙 desired-state 동기화 (IaC 사용 시 불필요) |

### 4.3 `backend-build.yml` 핵심 단계

1. `actions/checkout@v4`
2. `aws-actions/configure-aws-credentials@v4` — `role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}`
3. `docker/setup-buildx-action@v3` (arm64 크로스)
4. `aws-actions/amazon-ecr-login@v2`
5. `docker buildx build --platform linux/arm64 --push -t <ecr>/${{ vars.ECR_REPO }}:${{ github.sha }} backend/`
6. `echo "image_uri=..." >> "$GITHUB_OUTPUT"`
7. (옵션) `trivy image` 또는 `docker scout` — CVE 스캔 → HIGH/CRITICAL 발견 시 fail.

### 4.4 `backend-deploy.yml` 핵심 단계 (per-env job)

```
dev  → stg (manual approval) → prod (manual approval, environment=prod)
```

각 job:
1. OIDC assume role.
2. `aws lambda update-function-code --function-name todolist-api --image-uri <image>`
3. `aws lambda wait function-updated-v2`
4. `VERSION=$(aws lambda publish-version ... --query Version --output text)`
5. `aws lambda update-alias --name <env> --function-version $VERSION`
6. Smoke test: `curl -fsS https://<env>.api.todolist.../health`
7. 실패 시: `aws lambda update-alias --name <env> --function-version $PREV_VERSION` (이전 버전을 step 2 이전에 기록해 둠) → `exit 1`.

> Cron Lambda(`todolist-cron`)는 동일한 이미지 URI로 **같은 job 안에서** 갱신. 두 Lambda가 버전 불일치로 운영되지 않도록 한 alias 전환 블록으로 묶는다.

### 4.5 환경 승격 규칙

| 환경 | 트리거 | 승인 |
|---|---|---|
| `dev` | `main` push 자동 | 없음 |
| `stg` | tag `v*` 생성 자동 | 없음, smoke 실패 시 자동 롤백 |
| `prod` | `workflow_dispatch(env=prod)` | GH Environment `prod` required reviewer 1인 이상 |

---

## 5. Scheduler(EventBridge) 설계

### 5.1 현재 후보 잡 (기존 `backend/src/scheduler/` 기준)
| 잡 | Cron (KST) | 핸들러 이벤트 |
|---|---|---|
| 일일 회고 알림 | `cron(0 22 * * ? *)` | `{ "job": "daily-review-notify" }` |
| 이월(CarryOver) 정리 | `cron(5 0 * * ? *)` | `{ "job": "carry-over-cleanup" }` |
| FCM 토큰 만료 정리 | `cron(0 3 * * ? *)` | `{ "job": "fcm-token-prune" }` |

### 5.2 Lambda `scheduler.handler` 라우팅

```ts
// backend/src/scheduler.ts
export const handler = async (event: { job: string }) => {
  const app = await getCachedApp();
  switch (event.job) {
    case 'daily-review-notify': return app.get(NotificationScheduler).runDailyReview();
    case 'carry-over-cleanup':  return app.get(CarryOverScheduler).run();
    case 'fcm-token-prune':     return app.get(FcmTokenScheduler).prune();
    default: throw new Error(`unknown job: ${event.job}`);
  }
};
```

> 이벤트의 `job` 필드로 핸들러를 분기. EventBridge Schedule은 Target Input을 JSON으로 고정 지정.

### 5.3 운영 규칙
- 동시 실행 1로 제한: Lambda reserved concurrency = 1 (cron 잡 한정) → 중복 실행 방지.
- 실패 시 SQS DLQ로 전송, CloudWatch Alarm 1회/10분 초과 시 알림.
- 장기 실행 잡(> 15분)은 Step Functions로 분할 (현재 범위 밖, 필요 시 별도 스펙).

---

## 6. Observability & 롤백

### 6.1 로그 규칙
- Lambda `AWS_LAMBDA_LOG_FORMAT=JSON` 적용 → CloudWatch Insights 쿼리 최적화.
- 민감값 프리픽스 마스킹 (CLAUDE.md 준수): FCM 토큰은 앞 8자, Apple 응답 본문은 300자.

### 6.2 메트릭 / 알람

CDK 가 합성하는 알람 6종 — 모두 SNS Topic `todolist-alarms-{env}` 로 라우팅. subscription(이메일/Slack/Telegram) 은 운영자가 RUNBOOK 절차로 추가.

| Lambda | 지표 | 임계 | 대응 |
|---|---|---|---|
| api | `Errors` (1분 합계) | ≥ 5 | 알림 + 조사 |
| api | `Duration p95` (5분) | ≥ 3000ms | 조사 티켓 |
| cron | `Errors` (1분 합계) | ≥ 5 | 알림 + 조사 |
| cron | `Throttles` (1분 합계) | ≥ 1 | reserved=1 환경에서 throttle = 잡 누락 → 즉시 조사 |
| cron | `Duration p95` (5분) | ≥ 3000ms | 조사 티켓 |
| DLQ | `ApproximateNumberOfMessagesVisible` (1분 max) | ≥ 1 | Scheduler→Lambda 호출 실패 누적 → 즉시 알림 |

> Function URL 의 4xx/5xx 는 Lambda `Errors` 와 사실상 같은 신호이므로 별도 알람 없음. CloudFront 로 전환 시 Edge 5xx 알람 추가.

### 6.3 롤백 절차 (1분 내)
```
aws lambda update-alias \
  --function-name todolist-api \
  --name live \
  --function-version <PREV>
aws lambda update-alias \
  --function-name todolist-cron \
  --name live \
  --function-version <PREV>
```
> 이전 버전 번호는 매 배포 시 GH Actions artifact(`previous-version.txt`)로 남긴다.

---

## 7. 진행 체크리스트 (작업 순서)

- [x] **1. Backend 코드 선행 수정 (배포 안전장치)** — _§8-⑦ 근거_ (2026-04-22 완료)
  - `backend/src/common/config/database.config.ts`
    - `migrationsRun: true` → **`false`** (Lambda 콜드스타트 경쟁 조건 방지)
    - `extra: { max: 1, connectionTimeoutMillis: 5000, statement_timeout: 10000 }` 추가
    - Prod 환경에서 `ssl: { rejectUnauthorized: true }` 강제 (Supabase는 SSL 필수)
  - 마이그레이션 실행은 **배포 파이프라인의 one-shot 잡**에서 수행 (§4 워크플로우 내)
- [x] **2. 인프라 부트스트랩(1회성)** — AWS CDK(TypeScript) (2026-04-22 완료, 50 tests passing)
  - CDK 프로젝트 `infra/` 스캐폴딩 (`cdk init app --language typescript`)
  - **2-Stack 분할**: `TodolistShared` (account-wide 1회) + `TodolistBackend-{env}` (env별)
  - **TodolistShared**: GitHub OIDC Provider + Deploy Role(`todolist-gha-deploy`)
    - 신뢰 정책: `repo:KyungjeCho/todo-list:ref:refs/heads/main` + `refs/tags/v*` 만 허용
    - 권한(현재): ECR push (`todolist-backend-*` 한정) + `ecr:GetAuthorizationToken`
    - 권한(후속): Lambda update / SSM read 는 해당 Construct 추가 시 확장
    - MaxSessionDuration: 1시간
  - **TodolistBackend-{env}** 의 리소스:
    - ECR Repository(`todolist-backend-{env}`) — env별 격리, image scan on push, **IMMUTABLE 태그**, **RemovalPolicy=RETAIN**, lifecycle 최신 20개 보존
    - **SSM 명명 규약 모듈** (`infra/lib/ssm-parameters.ts`) — `/todolist/{env}/*` 경로의 7종 시크릿(database_url, jwt_secret, jwt_refresh_secret, oauth_state_secret, apple_private_key, fcm_service_account_json, gemini_api_key) 이름을 typed constants 로 정의. **값 자체는 CDK 가 만들지 않음** — CloudFormation 의 SecureString 미지원 + git 시크릿 유출 위험 회피 목적. 운영자가 `aws ssm put-parameter --type SecureString` 로 수동 등록(RUNBOOK_DEPLOY 참조).
    - **`stack.grantSsmRead(grantee)` 헬퍼** — Lambda 실행 역할에 `ssm:GetParameter*` (Resource=`/todolist/{env}/*`) + `kms:Decrypt` (Resource=`alias/aws/ssm`) 권한을 단일 진입점에서 부여. env 간 시크릿 노출 차단.
    - **Lambda 2개** — `todolist-api-{env}` (30s/512MB) + `todolist-cron-{env}` (300s/1024MB), 둘 다 arm64 + `PackageType=Image`. ECR 의 **`placeholder` 태그** 를 가리키며, 실제 운영 이미지는 CI 의 `aws lambda update-function-code` 로만 갱신. **`cdk deploy` 는 인프라 변경 시에만 수동 트리거** — 일상 배포로 image 가 placeholder 로 되돌아가는 사고 방지. 첫 배포 전 운영자가 placeholder 이미지 1회 push 필요(RUNBOOK).
    - **SSM 파라미터 이름을 env var 로 주입** (`DATABASE_URL_PARAM`, `JWT_SECRET_PARAM` 등 7종) — backend ssm-loader 가 콜드스타트 시 GetParameter 호출. 시크릿 값 자체는 CloudFormation 템플릿/CW 로그에 노출되지 않음.
    - **api Lambda Function URL** — `AuthType=NONE` (인증은 NestJS JWT 가드 담당), CORS 는 Function URL 측에서만 (`allowedOrigins=*` placeholder, NestJS helmet/CORS 와 헤더 중복 방지). 추후 web 어드민 등장 시 origin 좁힘. `BackendApiFunctionUrl` 출력은 OAuth 4종 콘솔 등록 + 모바일 앱 BASE_URL 에 사용.
    - **EventBridge Scheduler 3종** (§5.1) — Schedule Group `todolist-{env}` 1개 + Schedule 3개(daily-review-notify / carry-over-cleanup / fcm-token-prune). 모두 `Asia/Seoul` timezone(UTC 변환 실수 차단), `FlexibleTimeWindow=OFF`, target input 으로 `{ "job": "..." }` JSON 고정. cron Lambda 1개를 공유하되 input 의 `job` 으로 핸들러 분기. Scheduler 전용 IAM Role(`scheduler.amazonaws.com` 가 assume) 이 cron Lambda `InvokeFunction` 권한 보유.
    - **cron Lambda 동시성 제한** — `ReservedConcurrentExecutions=1` (§5.3). 같은 잡이 두 번 동시에 돌면서 DB/외부 API 중복 호출되는 사고 차단. api 는 미설정(트래픽 폭증 시 throttle 회피).
    - **SNS Topic** `todolist-alarms-{env}` — 알람 라우팅 단일 진입점. subscription(이메일/Slack/Telegram) 은 운영자가 RUNBOOK 으로 추가/제거(인프라 PR 불필요).
    - **SQS DLQ** `todolist-dlq-{env}` (보존 14일) — EventBridge Schedule 3개의 `DeadLetterConfig` 에 연결. Scheduler 가 cron Lambda 호출 자체에 실패한 페이로드 보존.
    - **CloudWatch Alarm 6종** (§6.2 표 참조) — 모두 SNS Topic 으로 라우팅. `treatMissingData=NOT_BREACHING` 으로 idle 구간 false-positive 차단.
- [x] **3. Backend 런타임 코드 추가** (2026-04-22 완료, 14 tests passing)
  - `backend/src/scheduler.ts` — EventBridge Scheduler 가 보내는 `{ job: '...' }` 페이로드를 라우팅. `daily-review-notify` → `NotificationSchedulerUsecase`, `carry-over-cleanup` → `CarryoverSchedulerUsecase`. `fcm-token-prune` 은 backend 미구현으로 라우터 인식 + no-op (인프라 변경 없이 후속 PR 에서 구현 가능). 캐시된 `INestApplicationContext` 로 콜드스타트 비용 분할 상환. (8 tests)
  - `backend/src/common/config/ssm-loader.ts` — 7종 시크릿(`*_PARAM` env → 실제 키)을 SSM `GetParameters(WithDecryption=true)` 1회 호출로 일괄 로드해 `process.env` 주입. 캐시·실패 시 캐시 미저장(다음 invocation 재시도)·`InvalidParameters` 차단. (6 tests)
  - `backend/src/lambda.ts` — `bootstrap()` 시작부에 `await loadSecretsFromSsm()` 추가(HTTP Lambda 도 동일 시크릿 필요).
  - `backend/Dockerfile` — `CMD ["dist/src/lambda.handler"]` 로 수정(NestJS 빌드 출력이 `dist/src/` 하위). cron 은 CDK `ImageConfig.Command` 로 `dist/src/scheduler.handler` override.
  - `backend/package.json` — `@aws-sdk/client-ssm` 의존성 추가.
- [ ] **4. GH 설정** (§3.3 참조)
  - Repository Secret: `AWS_DEPLOY_ROLE_ARN` (Shared Stack 배포 후 출력값)
  - Environments 2개 생성:
    - `dev` — protection rule 없음. main push 시 자동 배포
    - `prod` — required reviewer ≥ 1인 + deployment branch = tags matching `v*`
  - 각 Environment 에 Variables 4종 (env-suffix 포함 값): `AWS_REGION`, `ECR_REPO`, `LAMBDA_API_NAME`, `LAMBDA_CRON_NAME`
- [ ] **5. 워크플로우**
  - `.github/workflows/backend-build.yml` (Docker buildx arm64 → ECR)
  - `.github/workflows/backend-deploy.yml` (마이그레이션 one-shot → Lambda update → alias 전환 → smoke)
- [ ] **6. Runbook**
  - `docs/RUNBOOK_DEPLOY.md` — 수동 배포/롤백 절차
  - `docs/RUNBOOK_INCIDENT.md` — 장애 대응 (429, 5xx, cron 실패, Supabase pause 복구)

---

## 8. 결정 사항 (2026-04-21 확정) 및 후속 과제

### 확정된 결정

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| ① | **IaC 도구** | **AWS CDK (TypeScript)** | 프로젝트 전체가 TS strict. Construct 재사용성과 타입 안전성 확보. CloudFormation이 상태 관리 → S3/DynamoDB 락 불필요. 현재 모든 인프라가 AWS 전용이라 Terraform의 멀티 클라우드 이점 무의미. |
| ② | **API URL** | **Lambda Function URL** (`https://<id>.lambda-url.ap-northeast-2.on.aws/`) | 도메인 미보유 + 초기 트래픽 0 단계. 요청당 과금 없음, ACM/Route53 불필요. ⚠️ Lambda 삭제·재생성 시 URL 변경 → OAuth 4종(Google/Naver/Kakao/Apple) 콘솔 재등록 필요. dev 한정으로 운용하고 prod 출시 전 CloudFront + ACM + 도메인으로 전환. |
| ③ | **Pooler 모드** | **Transaction mode (port 6543)** + `extra.max=1` + SSL 강제 | Lambda 서버리스의 정석. Supabase Free의 60 conn 제한을 `max=1` 로 방어. Supabase pooler는 extended protocol 지원하므로 `pg` driver의 parameterized query 호환. |
| ④ | **VPC 배치** | **Lambda VPC 미연결** | Supabase Free/Pro는 IP allowlist 미지원 → VPC로 묶어도 보안 이득 0. NAT Gateway 월 $30+ 순수 낭비. |
| ⑤ | **Canary 배포** | **당분간 All-at-once** (smoke test + 수동 롤백) | CloudWatch Alarm 신뢰도가 선결 조건. DAU 1000+ 또는 관측 체계 완비 시 Canary 도입 재검토. |
| ⑥ | **환경 구성** | **`dev=로컬 Docker Postgres` / `prod=Supabase Free` (2환경)** | Supabase Free는 **7일 미사용 시 pause** + 프로젝트 2개 제한. Pro($25/월) 승격 시 `stg` 추가하여 3환경 복원. |
| ⑦ | **Backend 선행 안전장치** | `migrationsRun: false` + TypeORM `extra` 옵션 + SSL 강제 | Lambda 콜드스타트에서 여러 인스턴스가 마이그레이션 동시 실행하는 경쟁 조건 차단. 마이그레이션은 배포 파이프라인의 one-shot 잡으로만 실행. |

### 후속/재검토 과제

- **커스텀 도메인 도입 (CloudFront + ACM)**: prod 출시 또는 OAuth 콜백 URL 안정화 필요 시점. CloudFront 앞단 → ACM 인증서(`us-east-1` 필수) → Lambda Function URL Origin. 도메인은 Cloudflare Registrar `.com`(~$10/년) 최우선 후보.
- **Supabase 플랜 업그레이드 시점**: 실사용자 발생 시 즉시 Pro로 승격 (pause 해제 + Point-in-Time Recovery).
- **Canary 도입**: §6.2 알람 임계가 실트래픽으로 검증된 이후.
- **`stg` 환경 복원**: Supabase Pro 승격 후 프로젝트 3개 확보 시.
- **관측성 강화**: CloudWatch → Grafana/Datadog 연동은 비용-효용 따져서 별도 결정.
- **이미지 CVE 스캔**: 현재 ECR `scan on push` 만 활성. HIGH/CRITICAL 발견 시 빌드 차단 정책은 워크플로우 작성 시 도입 검토.

---

## 9. 부록 — 용어

- **Alias**: Lambda 버전(immutable) 위에 붙는 포인터. 트래픽 전환/롤백 단위.
- **HTTP API**: API Gateway v2. 저렴·단순. REST API(v1)보다 권장.
- **OIDC**: GH Actions가 단기 토큰을 발급받아 AWS IAM Role을 Assume. 장기 Access Key 제거 목적.
- **EventBridge Scheduler**: 2022년 이후 서비스. 기존 Rule-기반 cron 대비 timezone, flex window 지원.
