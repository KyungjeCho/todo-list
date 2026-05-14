#!/usr/bin/env bash
#
# upload-secrets.sh — todolist 백엔드의 SSM SecureString 시크릿 7종을 일괄 등록.
#
# WHY: SecureString 은 CloudFormation 미지원이라 CDK 로 등록할 수 없다.
# 운영자가 이 스크립트로 수동 등록하고, IaC 는 read 권한만 부여한다.
# (docs/INFRA_SPEC.md §3.2, §7-6 RUNBOOK_DEPLOY)
#
# 사용법: ./infra/scripts/upload-secrets.sh <env>
#   <env> ∈ {dev, prod}
#
# 사전 준비:
#   - AWS CLI v2 설치, profile `todolist-admin` 구성됨
#   - openssl 사용 가능
#   - dev 의 경우 Supabase Transaction pooler URI 손에 들고 있을 것
#
# 등록되는 7종(모두 SecureString, /todolist/<env>/<key>):
#   1. database_url             ← 사용자 입력(stdin, echo 끔)
#   2. jwt_secret               ← openssl rand -base64 64 자동 생성
#   3. jwt_refresh_secret       ← 자동 생성
#   4. oauth_state_secret       ← 자동 생성
#   5. apple_private_key        ← 플레이스홀더 (Apple OAuth dev 비활성)
#   6. fcm_service_account_json ← 플레이스홀더 (FCM dev 미테스트)
#   7. gemini_api_key           ← 플레이스홀더 (Voice dev 미테스트)
#
# 보안:
#   - 시크릿 값은 stdout/로그에 절대 출력하지 않음
#   - --overwrite 사용 → 기존 값 있으면 덮어씀(실행 전 확인 프롬프트)

set -euo pipefail

readonly AWS_PROFILE_NAME="todolist-admin"
readonly AWS_REGION_NAME="ap-northeast-2"
readonly SSM_PREFIX="/todolist"

# Apple/FCM/Gemini dev 미사용 — 백엔드가 시작은 하되 해당 기능을 호출하면
# 명시적으로 실패하도록 식별 가능한 플레이스홀더를 사용한다.
readonly PLACEHOLDER_APPLE="DEV_PLACEHOLDER_NOT_CONFIGURED"
readonly PLACEHOLDER_FCM='{"_placeholder":"DEV_NOT_CONFIGURED"}'
readonly PLACEHOLDER_GEMINI="DEV_PLACEHOLDER_NOT_CONFIGURED"

usage() {
  echo "Usage: $0 <env>"
  echo "  <env> ∈ {dev, prod}"
  exit 1
}

[[ $# -eq 1 ]] || usage
readonly ENV="$1"
case "$ENV" in
  dev|prod) ;;
  *) echo "ERROR: env 는 dev 또는 prod 여야 합니다 (입력: $ENV)" >&2; usage ;;
esac

# 의존성 확인
command -v aws >/dev/null 2>&1 || { echo "ERROR: aws CLI 가 PATH 에 없습니다" >&2; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo "ERROR: openssl 이 PATH 에 없습니다" >&2; exit 1; }

# AWS 자격 확인 (계정/리전)
echo "→ AWS 자격 확인 중..."
ACCOUNT_ID="$(aws sts get-caller-identity \
  --profile "$AWS_PROFILE_NAME" \
  --query Account --output text)"
echo "  account: $ACCOUNT_ID"
echo "  region:  $AWS_REGION_NAME"
echo "  env:     $ENV"
echo

# 기존 파라미터 존재 여부 안내
echo "→ 기존 파라미터 확인..."
EXISTING_COUNT="$(aws ssm describe-parameters \
  --profile "$AWS_PROFILE_NAME" \
  --region "$AWS_REGION_NAME" \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=${SSM_PREFIX}/${ENV}/" \
  --query 'length(Parameters)' --output text 2>/dev/null || echo "0")"
echo "  ${SSM_PREFIX}/${ENV}/* 에 이미 ${EXISTING_COUNT}개 등록됨"
echo

read -r -p "계속 진행하면 7종 시크릿이 모두 ${SSM_PREFIX}/${ENV}/* 에 (덮어쓰기로) 등록됩니다. 진행할까요? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[yY]$ ]] || { echo "중단."; exit 0; }
echo

# ── 1. DATABASE_URL ─────────────────────────────────────────────────────────
# WHY: Supabase Transaction pooler URI. 비밀번호가 포함되므로 stdin echo 끔.
echo "→ database_url 입력 (Supabase Transaction pooler URI, 입력 시 화면에 표시되지 않음)"
echo "  형식 예: postgres://postgres.xxx:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
read -r -s -p "  database_url> " DATABASE_URL
echo
if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: database_url 이 비어 있습니다" >&2; exit 1
fi
# 6543 포트(pooler) 사용 여부 가벼운 검증
if [[ "$DATABASE_URL" != *":6543/"* ]]; then
  echo "WARN: URI 에 :6543/ 가 보이지 않습니다 — Direct connection(5432) 일 수 있습니다."
  read -r -p "  그래도 진행할까요? [y/N] " GO
  [[ "$GO" =~ ^[yY]$ ]] || exit 1
fi

# ── 2~4. 자동 생성 시크릿 ──────────────────────────────────────────────────
echo "→ jwt_secret, jwt_refresh_secret, oauth_state_secret 자동 생성 중..."
JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
JWT_REFRESH_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
OAUTH_STATE_SECRET="$(openssl rand -base64 64 | tr -d '\n')"

# ── 업로드 헬퍼 ────────────────────────────────────────────────────────────
put_secret() {
  local key="$1" value="$2"
  local name="${SSM_PREFIX}/${ENV}/${key}"
  aws ssm put-parameter \
    --profile "$AWS_PROFILE_NAME" \
    --region "$AWS_REGION_NAME" \
    --name "$name" \
    --type SecureString \
    --overwrite \
    --value "$value" \
    --output text >/dev/null
  echo "  ok $name"
}

echo "→ SSM 업로드 시작..."
put_secret "database_url"             "$DATABASE_URL"
put_secret "jwt_secret"               "$JWT_SECRET"
put_secret "jwt_refresh_secret"       "$JWT_REFRESH_SECRET"
put_secret "oauth_state_secret"       "$OAUTH_STATE_SECRET"
put_secret "apple_private_key"        "$PLACEHOLDER_APPLE"
put_secret "fcm_service_account_json" "$PLACEHOLDER_FCM"
put_secret "gemini_api_key"           "$PLACEHOLDER_GEMINI"

# 메모리에서 시크릿 제거(쉘 종료 전까지의 잔존 시간 단축)
unset DATABASE_URL JWT_SECRET JWT_REFRESH_SECRET OAUTH_STATE_SECRET
echo

# ── 검증 ────────────────────────────────────────────────────────────────────
echo "→ 검증: 7개 파라미터가 모두 등록됐는지 확인"
aws ssm describe-parameters \
  --profile "$AWS_PROFILE_NAME" \
  --region "$AWS_REGION_NAME" \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=${SSM_PREFIX}/${ENV}/" \
  --query 'Parameters[].Name' --output table

echo
echo "완료. 다음 단계:"
echo "  1. PR #263 머지 → backend-build 워크플로우가 ECR 에 이미지 푸시"
echo "  2. backend-deploy 워크플로우가 migrate Lambda 호출 + api/cron 갱신"
echo "  3. Function URL 의 /health 가 200 인지 확인"
