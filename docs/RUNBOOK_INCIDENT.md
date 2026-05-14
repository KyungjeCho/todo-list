# RUNBOOK — 장애 대응

todo-list backend(NestJS Lambda) 운영 중 자주 마주칠 장애 유형의 진단/복구 절차. 평상 배포는 [RUNBOOK_DEPLOY.md](./RUNBOOK_DEPLOY.md) 를 참조.

## 0. 트리아지 순서

1. **증상 정의** — 사용자 측 5xx? cron 잡 누락? 알람 어떤 종류? 빈도?
2. **최근 변경 확인** — `git log --oneline -10` + `gh run list --branch=main --limit=10`. 시간 상관관계가 있으면 §A (smoke 실패 → 자동 롤백 작동했는지) 먼저.
3. **로그 1차 확인** — `aws logs tail /aws/lambda/todolist-api-dev --since 15m`. 최근 에러 패턴이 §B~§F 중 어디에 해당하는지 매칭.
4. **데이터 일관성 위험 여부** — DB 쓰기가 부분 실패한 흔적이 있으면 트래픽 차단(§Z) 먼저 후 분석.

## A. Deploy smoke test 실패 → 자동 롤백

`backend-deploy` 워크플로우가 `/health` 5회 모두 실패하면 `Rollback alias on smoke failure` step 이 작동.

확인 절차:
1. https://github.com/KyungjeCho/todo-list/actions/workflows/backend-deploy.yml 에서 최신 실패 run 열어 `Rollback` step 의 출력 확인
   - `Rolled back: todolist-api-dev → version N` — 롤백 성공. 사용자 영향 1~2분
   - `No previous version (first deploy — skip rollback)` — 첫 배포라 롤백 대상 없음. api Lambda 가 broken 상태로 남음 → §B/§C 진단 후 빈 커밋으로 재배포
2. 롤백 후 `/health` 가 다시 200 인지 확인 (`curl https://<fn-url>/health`)
3. 실패한 SHA 를 본인이 분석할 수 있을 때까지 그대로 두고 **새 PR 머지를 금지**. 같은 메인 위에서 새 빌드가 또 실패하면 정상 코드까지 묻힐 위험.

```bash
# 현재 live 가 가리키는 버전 확인
aws lambda get-alias --function-name todolist-api-dev --name live \
  --profile todolist-admin --region ap-northeast-2 \
  --query FunctionVersion --output text
```

## B. Migration step 실패

`backend-deploy` 가 `Run DB migrations (one-shot via migrate Lambda)` 에서 멈춤. api/cron 코드는 아직 교체되지 않은 상태 — **traffic 영향 없음**(이전 버전 그대로 서빙). 안전한 상태에서 진단.

증상별 원인:

| `errorMessage` 패턴 | 원인 | 조치 |
|---|---|---|
| `Cannot find module 'X'` | 빌드 산출물 누락 / CMD path 불일치 | 로컬 `npm run build` 로 `dist/src/X.js` 존재 확인. `tsconfig.build.json` 의 `rootDir` 와 CDK 의 `cmd:` 정합 |
| `ECONNREFUSED 127.0.0.1:5432` | DATABASE_URL 누락 → localhost 폴백 | §C — SSM 로드 / DataSource 초기화 순서 확인 |
| `self-signed certificate in certificate chain` | strict TLS + Supabase 자체 root | `data-source.ts` / `database.config.ts` 의 `rejectUnauthorized=false` 유지 확인 |
| `(ENOTFOUND) tenant/user postgres.<ref> not found` | DATABASE_URL 의 project ref 가 Supabase 측에 없음 | §D — SSM 의 URL 재확인 |
| `password authentication failed` | DATABASE_URL 의 password 오타 또는 만료 | Supabase Settings → Database 에서 비밀번호 재설정 → §C 의 SSM 갱신 |
| `Timeout connecting to ...` / `getaddrinfo ENOTFOUND` | DNS 또는 outbound 차단 | Lambda VPC 미연결 가정. AWS health dashboard 확인 |
| `SyntaxError` / `relation "X" already exists` | TypeORM migration 파일 결함 | migration 코드 검토 — `IF NOT EXISTS` 누락된 raw SQL? 직전 PR 머지가 원인일 가능성 |

수동 invoke 로 재현:
```bash
aws lambda invoke \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-migrate-dev --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail --output json /tmp/m.json \
  | jq -r '.LogResult' | base64 -d
cat /tmp/m.json | jq
```

## C. SSM 시크릿 로드 실패

증상: `Missing required SSM param env vars: ...` 또는 `SSM returned InvalidParameters: ...` 또는 모든 `*_SECRET` 이 빈 값으로 보임.

원인 후보 + 조치:

1. **파라미터 누락** — 7개 모두 등록됐는지 확인. 누락분은 [RUNBOOK_DEPLOY.md §3/§4](./RUNBOOK_DEPLOY.md) 로 등록.
   ```bash
   aws ssm describe-parameters \
     --profile todolist-admin --region ap-northeast-2 \
     --parameter-filters "Key=Name,Option=BeginsWith,Values=/todolist/dev/" \
     --query 'length(Parameters)' --output text
   # → 7 이 아니면 누락
   ```
2. **IAM 권한 부족** — Lambda 실행 역할의 `ssm:GetParameters` / `kms:Decrypt` 가 빠짐. `infra/lib/todolist-backend-stack.ts` 의 `grantSsmRead` 호출 누락 의심 → `cdk diff` + `cdk deploy`.
3. **파라미터 이름 mismatch** — CDK 의 `ssmParameterNames(envName)` 와 SSM 에 실제 등록된 이름이 다름. 둘 다 출력해서 비교.
4. **KMS 키 거부** — 기본 키 `alias/aws/ssm` 가 아닌 customer-managed key 를 쓰는 경우 별도 권한 필요. 본 프로젝트는 기본 키 사용 → 보통 해당 없음.

## D. Supabase project ref 불일치

증상: `(ENOTFOUND) tenant/user postgres.<ref> not found` 또는 새 URL 로 바꿨는데 같은 에러 반복.

```bash
# SSM 에 실제 들어 있는 ref 가 무엇인지 확인
aws ssm get-parameter --name /todolist/dev/database_url \
  --with-decryption --profile todolist-admin --region ap-northeast-2 \
  --query 'Parameter.Value' --output text \
  | sed -E 's|postgres://postgres\.([^:]+):.*|ref=\1|'
```

Supabase 대시보드 (Project Settings → General) 의 Reference ID 와 비교. 불일치하면 [RUNBOOK_DEPLOY.md §4](./RUNBOOK_DEPLOY.md) 로 단일 갱신 → 강제 cold start (빈 커밋 push).

## E. OIDC AssumeRole 거부 (`sts:AssumeRoleWithWebIdentity` denied)

워크플로우의 `Configure AWS credentials (OIDC)` step 에서 실패.

가능한 원인:
1. **신뢰 정책의 `sub` 패턴이 워크플로우 컨텍스트와 불일치**
   - 워크플로우가 `environment: <name>` 을 선언하면 GitHub 가 `sub` 를 `repo:OWNER/REPO:environment:<name>` 으로 덮어씀
   - 신뢰 정책의 `StringLike."token.actions.githubusercontent.com:sub"` 배열에 ref(`refs/heads/main`, `refs/tags/v*`) **와** environment(`environment:dev`, `environment:prod`) 둘 다 포함되어야 함
   - 확인 — `infra/lib/todolist-shared-stack.ts` 의 `createDeployRole`
2. **`AWS_DEPLOY_ROLE_ARN` Secret 미설정 또는 오타**
3. **fork 의 PR 에서 OIDC 시도** — 기본적으로 fork 는 secret 접근 불가, 시도 자체가 거부됨. 신뢰 정책의 `:ref:` 패턴은 본 리포만 허용 → 정상 차단.

수정 후 적용은 `cdk deploy TodolistShared` 로 IAM 정책 갱신.

## F. Supabase Free 7일 무사용 pause

증상: `/health` 가 `database: "disconnected"` 또는 모든 DB 호출 timeout. 가장 흔한 시점은 휴가 직후 + 트래픽 0 인 환경.

복구:
1. Supabase 대시보드 → 프로젝트 클릭 → **Restore** 버튼 (자동 unpause). 일반적으로 1~3분
2. 그 사이 Lambda 가 콜드스타트 마다 connection timeout 으로 5초씩 깎임 → 사용자 측 502 잠시 노출 가능
3. Unpause 후 `curl /health` 200 확인. cron 잡은 다음 트리거 시 자동 정상화 (별도 액션 불필요)

장기 대책: 7일 안에 1회라도 트래픽이 발생하도록 cron 잡 또는 외부 monitor(`curl /health` 매일 1회) 를 둠. Pro 승격하면 pause 자체 사라짐.

## G. cron 잡 실패 / 누락

증상: EventBridge Scheduler 가 트리거했는데 실행 안 됨 / 매번 에러.

진단:
```bash
# 최근 cron Lambda 호출 로그
aws logs tail /aws/lambda/todolist-cron-dev \
  --profile todolist-admin --region ap-northeast-2 \
  --since 1h --filter-pattern ERROR

# DLQ (Scheduler 가 cron 호출 자체에 실패한 페이로드)
aws sqs receive-message \
  --profile todolist-admin --region ap-northeast-2 \
  --queue-url $(aws sqs get-queue-url --queue-name todolist-dlq-dev \
    --profile todolist-admin --region ap-northeast-2 --query QueueUrl --output text) \
  --max-number-of-messages 10
```

가능한 원인:
- **Lambda 측 에러** — CloudWatch 로그에 stack trace. 코드 버그 → PR 로 수정
- **Scheduler → Lambda 호출 자체 실패** — DLQ 에 메시지. IAM Role(`CronSchedulerRole`) 의 `lambda:InvokeFunction` 권한 / Lambda concurrency 0 / Lambda 삭제됨 중 하나
- **cron Lambda reservedConcurrentExecutions=1 이 경합 중** — 이전 잡이 5분 안에 안 끝나서 다음 트리거가 throttle. 잡 자체 hang 의심 → 로그 확인

## H. CloudWatch 알람 발화 시 triage

|알람 이름 패턴 | 의미 | 첫 액션 |
|---|---|---|
| `*ApiErrors*` | api Lambda 5xx 율 임계 초과 | §I (5xx 폭주) |
| `*ApiThrottles*` | api Lambda throttle | quota / reserved 충돌 확인. `get-account-settings` 의 UnreservedConcurrentExecutions 가 100 미만이면 reserved 잡힌 곳을 풀어야 함 |
| `*CronErrors*` | cron Lambda 에러 | §G |
| `*DlqDepth*` | SQS DLQ 메시지 적재 | §G — DLQ 메시지 직접 확인 |
| `*MigrateDuration*` | migration Lambda 5분 timeout 근접 | 마이그레이션 자체가 길어진 것 — DDL 검토 (인덱스 생성? 대용량 backfill?) |
| `*SchedulerInvocationsDropped*` | EventBridge 가 잡 실행 자체를 포기 | Scheduler 측 IAM / target 설정 / Lambda 존재 확인 |

알람 정의는 `infra/lib/todolist-backend-stack.ts` 의 `createAlarms` 참조 (§6.2 표).

## I. api 5xx 폭주

```bash
# 최근 5분 에러 패턴 빠르게 추출
aws logs tail /aws/lambda/todolist-api-dev \
  --profile todolist-admin --region ap-northeast-2 \
  --since 5m --filter-pattern '"ERROR"' | head -50

# 콜드스타트 vs 실제 에러 비율 — INIT_REPORT 가 많으면 콜드스타트 폭주
aws logs tail /aws/lambda/todolist-api-dev \
  --profile todolist-admin --region ap-northeast-2 \
  --since 5m --filter-pattern 'INIT_REPORT' | wc -l
```

분기:
- **모듈 import 단계 에러** (`Runtime.ImportModuleError` / `Runtime.ExitError`) — 직전 배포의 환경변수 / 시크릿 / 빌드 산출물 문제. §B/§C 와 같은 진단. 빠른 복구는 §A 의 수동 롤백
- **DB 측 timeout** — Supabase pause(§F) 또는 connection 한도 초과 (Free 60 conn 한도, Lambda 가 `extra.max=1` 로 제한되지만 같은 시점 100 인스턴스가 동시 부팅하면 100 conn 필요) → 즉시는 traffic 자체를 줄일 수 없음 → §F 의 cron 트래픽 정리 또는 Pro 승격
- **앱 레이어 throw** — NestJS Exception filter 가 받는 일반 에러. 트레이스 보고 해당 컨트롤러/usecase 수정 PR

## Z. 긴급 traffic 차단

데이터 일관성을 깨는 버그가 의심돼 즉시 사용자 트래픽을 끊고 싶을 때:

```bash
# api Lambda 의 동시성을 0 으로 강제 — 모든 호출이 즉시 throttle
aws lambda put-function-concurrency \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-api-dev \
  --reserved-concurrent-executions 0
```

복구 시:
```bash
aws lambda delete-function-concurrency \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-api-dev
```

⚠️ cron 도 같이 멈추려면 `todolist-cron-dev` 에도 동일 적용. 단 cron 은 평소 reserved=1 이라 `put-function-concurrency 0` 후 복구 시 `delete-function-concurrency` 로 풀면 reserved=1 정상값으로 돌아오지 **않는다** — CDK 의 의도된 값으로 명시적으로 되돌려야 함:
```bash
aws lambda put-function-concurrency \
  --profile todolist-admin --region ap-northeast-2 \
  --function-name todolist-cron-dev \
  --reserved-concurrent-executions 1
```

## 부록 — 빠른 link

- CDK 인프라 코드: `infra/lib/`
- 워크플로우: `.github/workflows/backend-{build,deploy}.yml`
- 시크릿 등록 스크립트: `infra/scripts/upload-secrets.sh`
- SSM 명명 규약: `infra/lib/ssm-parameters.ts`
- backend SSM 로더: `backend/src/common/config/ssm-loader.ts`
- backend Lambda 진입점: `backend/src/{lambda,scheduler,migrate}.ts`
- 인프라 명세: [INFRA_SPEC.md](./INFRA_SPEC.md)
