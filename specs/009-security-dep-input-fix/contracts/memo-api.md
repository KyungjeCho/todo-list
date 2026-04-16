# API Contract 변경: Memo Endpoints

**Feature**: 009-security-dep-input-fix
**Date**: 2026-04-16

## 변경 사항 요약

Memo 생성/수정 엔드포인트의 `content` 필드에 최대 길이 제한(5000자)이 추가된다. 기존 요청 형식은 그대로 유지되며, 초과 시 400 에러가 반환된다.

## POST /memos — 메모 생성

### Request Body (변경 전후 동일)

```json
{
  "content": "string (required, non-empty, max 5000 characters)"
}
```

### 응답: 성공 (변경 없음)

- **201 Created**: 기존과 동일

### 응답: 검증 실패 (신규 추가 케이스)

- **400 Bad Request**: content가 5000자를 초과할 때

```json
{
  "statusCode": 400,
  "message": ["content must be shorter than or equal to 5000 characters"],
  "error": "Bad Request"
}
```

## PATCH /memos/:id — 메모 수정

### Request Body (변경 전후 동일)

```json
{
  "content": "string (required, non-empty, max 5000 characters)"
}
```

### 응답: 검증 실패 (신규 추가 케이스)

- **400 Bad Request**: content가 5000자를 초과할 때 (POST와 동일 형식)

## 하위 호환성

- 기존에 5000자 이하 content를 사용하던 모든 요청은 영향 없음
- 5000자 초과 content를 보내는 클라이언트는 400 에러를 수신함 (기존에 이런 사용 패턴이 없다고 가정)
