# Component Diagram

---

## Overview

```
┌─────────────────────┐         ┌──────────────────────────────────────────┐
│  Frontend           │  HTTP   │  Backend (NestJS)                        │
│  (React Native)     │────────▶│                                          │
│                     │         │  ┌──────────────────────────────────┐     │
│  iOS / Android      │         │  │ Controller                       │     │
│                     │         │  └──────────┬───────────────────────┘     │
└─────────────────────┘         │             │                            │
                                │  ┌──────────▼───────────────────────┐    │
                                │  │ Auth Guard (JWT)                  │    │
                                │  └──────────┬───────────────────────┘    │
                                │             │                            │
                                │  ┌──────────▼────┐  ┌──────────────┐    │
                                │  │ Todo Service   │  │ User Service  │    │
                                │  └──────────┬────┘  └──────┬───────┘    │
                                │             │              │             │
                                │  ┌──────────▼──┐  ┌───────▼────────┐   │
                                │  │ Scheduler    │  │ AI             │   │
                                │  │ Notification │  │ STT + LLM     │   │
                                │  │ / Carryover  │  │                │   │
                                │  └──────────┬──┘  └───────┬────────┘   │
                                │             │              │             │
                                │  ┌──────────▼──────────────▼────────┐   │
                                │  │ Repository (TypeORM)              │   │
                                │  └──────────┬───────────────────────┘   │
                                │             │                            │
                                │  ┌──────────▼───────────────────────┐   │
                                │  │ Notification Service              │   │
                                │  └──────────┬───────────────────────┘   │
                                └─────────────┼────────────────────────────┘
                                              │
                                ┌─────────────▼────────────────────────────┐
                                │  Supabase (PostgreSQL)                    │
                                │  Database                                 │
                                └──────────────────────────────────────────┘

                                ┌──────────────────────────────────────────┐
                                │  External Services                        │
                                │                                           │
                                │  ┌───────────┐ ┌─────┐ ┌───────┐ ┌─────┐│
                                │  │ OAuth 2.0 │ │ FCM │ │ STT   │ │ LLM ││
                                │  │ Google    │ │Push │ │ API   │ │ API ││
                                │  │ Naver     │ │Noti.│ │Speech │ │Text ││
                                │  │ Kakao     │ │     │ │to text│ │Refi.││
                                │  │ Apple     │ │     │ │       │ │     ││
                                │  └───────────┘ └─────┘ └───────┘ └─────┘│
                                └──────────────────────────────────────────┘
```

---

## Components

### Frontend (React Native)

| 컴포넌트 | 설명 |
|----------|------|
| React Native | iOS / Android 크로스 플랫폼 앱 |

### Backend (NestJS)

| 컴포넌트 | 설명 |
|----------|------|
| Controller | REST API 엔드포인트 처리 |
| Auth Guard (JWT) | 인증/인가 미들웨어 |
| Todo Service | 할 일 CRUD, 상태 변경, 이월 비즈니스 로직 |
| User Service | 사용자 프로필, 설정 관리 |
| Scheduler | 알림 스케줄링 (node-cron), 자정 자동 이월 |
| AI | STT + LLM API 호출을 통한 음성 인식 할 일 추가 |
| Repository | TypeORM 기반 데이터 접근 계층 |
| Notification Service | FCM 푸시 알림 발송 |

### Database

| 컴포넌트 | 설명 |
|----------|------|
| Supabase | PostgreSQL 기반 관리형 데이터베이스 |

### External Services

| 서비스 | 용도 |
|--------|------|
| OAuth 2.0 (Google, Naver, Kakao, Apple) | 소셜 로그인 인증 |
| FCM | 푸시 알림 발송 (Android / iOS) |
| STT API | 음성 → 텍스트 변환 |
| LLM API | 텍스트 다듬기 (할 일 정제) |
