# Data Model: Security Hardening — Dependency Upgrades & Input Validation

**Feature**: 009-security-dep-input-fix
**Date**: 2026-04-16

## 변경 대상 엔티티

### Memo (TodoMemo)

**스키마 변경**: 없음 (DB 레벨 변경 없음)

**검증 규칙 변경**:

| 필드 | 기존 규칙 | 추가 규칙 |
|------|-----------|-----------|
| `content` | `@IsString()`, `@IsNotEmpty()` | `@MaxLength(5000)` |

**영향 범위**:
- `CreateMemoDto`: content 필드에 MaxLength 검증 추가
- `UpdateMemoDto`: content 필드에 MaxLength 검증 추가
- `TodoMemo` 엔티티: 변경 없음 (TypeORM `text` 타입 유지)

**상태 전이**: 해당 없음 — Memo 엔티티의 상태 모델에 변경 없음

## 신규 엔티티

없음

## 마이그레이션

DB 마이그레이션 불필요 — 검증은 애플리케이션 레이어(DTO)에서만 수행
