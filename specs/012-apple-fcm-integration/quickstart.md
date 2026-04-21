# Quickstart: 애플 기기 FCM 연동 검증

**Date**: 2026-04-21
**Branch**: `012-apple-fcm-integration`
**Purpose**: 본 기능이 실제로 동작함을 로컬/CI/실기기 관점에서 스모크 테스트하는 절차. 구현 완료 직후 리뷰어·QA가 따라 실행 가능하도록 작성.

> ⚠️ 이 문서는 인프라(APNs Key 업로드)가 완료되었다고 가정한다. 미완료면 실기기 단계에서 푸시가 도달하지 않는다.

---

## 사전 준비 (1회성)

1. **Apple Developer 포털**
   - Certificates, IDs & Profiles > Keys에서 **APNs Auth Key(`.p8`) 1개 발급**. Key ID 기록.
   - Team ID 확인(계정 메뉴).
   - App ID(`com.todolist.app`) 의 **Push Notifications capability 활성화**.
2. **Firebase Console**
   - iOS 앱(`com.todolist.app`)의 Cloud Messaging 설정에서 위 `.p8` 키 업로드(Key ID, Team ID 포함).
3. **로컬 환경**
   - macOS + Xcode(Expo `prebuild`에 필요).
   - iOS 실기기 1대(시뮬레이터는 푸시가 간헐적으로 실패).
4. **환경 변수(backend)**
   - 기존 `firebase.projectId`, `firebase.privateKey`, `firebase.clientEmail`이 설정되어 있어야 함. 본 기능은 추가 변수 불필요.

---

## A. 로컬 코드 변경 적용

```bash
# 1) backend — 변경된 레포지토리/유스케이스 유닛 테스트 (Red → Green)
cd backend
npm test -- notification/register-device.usecase.spec.ts
npm test -- notification/send-notification.ios.spec.ts

# 2) 린트 + 전체 테스트
npm run lint && npm test

# 3) frontend — 훅 단위 테스트 + Maestro E2E (시뮬레이터)
cd ../frontend
npm test -- usePushNotification
npm run lint
```

---

## B. iOS 네이티브 엔터타이틀먼트 반영

1. `frontend/app.json` 의 `ios.entitlements`에 `aps-environment: "development"` 가 포함되어 있는지 확인(또는 관련 config plugin).
2. Expo prebuild 재생성:
   ```bash
   cd frontend
   npx expo prebuild --platform ios --clean
   ```
3. 생성된 `frontend/ios/frontend/frontend.entitlements`에 `aps-environment` 키가 있는지 확인.

---

## C. Maestro E2E (iOS 시뮬레이터)

```bash
cd frontend
# 기기/시뮬레이터 기동 후
maestro test .maestro/notification/ios_permission_register.yml
```

검증 항목:

- 앱 실행 → 로그인 완료 직후 시스템 권한 다이얼로그 노출(수락).
- 백엔드 로그에 `POST /users/me/devices` 기록 확인(토큰 프리픽스만).
- `todolist_user_device` 테이블에 `deviceType='IOS'` + 현재 로그인 유저 행이 존재.

> 시뮬레이터 특성상 실제 알림 수신은 본 E2E 범위가 아님. 다음 단계(D)에서 실기기로 검증.

---

## D. 실기기(또는 TestFlight) 수동 검증

1. **첫 로그인**
   - 실기기에서 앱 설치 → 로그인 → iOS 시스템 다이얼로그에서 "허용" 선택.
   - 백엔드 DB 확인: `todolist_user_device` 에 해당 사용자의 `deviceType='IOS'` + `deviceName` 행이 1건 활성.

2. **알림 수신(Plan/Review)**
   - 서버에서 해당 사용자의 `planTime` 또는 `reviewTime` 직전으로 스케줄 조정(또는 관리 엔드포인트/스크립트로 수동 트리거).
   - 기기에서 10초 이내에 알림 수신(잠금 화면/알림 센터).
   - 알림 탭 → 앱이 열리고, `type`에 맞는 화면(Plan/Review 모드)으로 진입.

3. **포그라운드 상태**
   - 앱을 열어둔 채 알림 트리거 → 앱 크래시 없음. 포그라운드 인앱 UI는 본 기능 스코프 외이므로 기본 동작(배너 비표시)만 확인.

4. **권한 거부 경로**
   - 기기 초기화(앱 재설치) → 권한 다이얼로그에서 "허용 안 함" 선택.
   - 백엔드 DB에 해당 사용자 `IOS` 행이 **생성되지 않아야 함**.
   - 앱 로그에 토큰 획득 실패 관련 에러 스택이 **없어야 함**.

5. **권한 후 허용으로 전환**
   - iOS 설정 > 앱 > 알림에서 허용으로 전환 → 앱 재실행.
   - `POST /users/me/devices` 호출 → 행 생성 확인.

6. **다기기(iPhone + iPad)**
   - 두 기기 모두 로그인 → DB에 두 행(서로 다른 `deviceName`) 모두 활성.
   - 알림 트리거 → 두 기기 모두 수신.

7. **로그아웃**
   - iPad에서만 로그아웃 → iPad 행이 `deletedAt` 설정(soft-deleted).
   - 알림 트리거 → iPad 미수신, iPhone 수신.

8. **앱 재설치(토큰 갱신)**
   - iPhone에서 앱 삭제 → 재설치 → 재로그인.
   - DB에서 기존 iPhone 행은 soft-deleted, 새 토큰의 새 행 활성. iPad 행은 영향 없음.

---

## E. 관측성·로그 체크

- 백엔드 로그: `Push notification sent to token: XXXXXXXX...` 형식으로 **프리픽스만** 출력되는지 확인.
- APNs Auth Key 값, Team ID, Key ID, 전체 FCM 토큰이 로그에 나오지 않는지 확인(grep으로 리뷰 시 재확인).
- 실패 경로 발생 시 `NotificationLog.status='FAIL'` 행이 쌓이는지, `errorMessage`에 민감값이 포함되지 않는지 확인.

---

## F. 롤백 시나리오

- 본 PR은 DB 스키마를 변경하지 않음 → 배포 롤백 시 데이터 마이그레이션 불필요.
- iOS 엔터타이틀먼트가 원복되면 다음 iOS 빌드부터 토큰 획득이 실패할 수 있으나 백엔드 호출이 발생하지 않으므로 서버 측 영향 없음.
- `upsertDevice` 규칙 변경 롤백 시 기존 iOS 다기기 공존 행들 중 하나가 다음 로그인에서 soft-delete될 수 있음. 알림만 끊기고 재로그인으로 회복 가능.

---

## 완료 기준(DoD 체크)

- [ ] 요구사항(FR-001~FR-012) 충족
- [ ] 유닛/통합 테스트 통과, 린트/타입 통과
- [ ] Maestro E2E(`.maestro/notification/ios_permission_register.yml`) 통과
- [ ] 실기기 수동 검증(D-1~D-8) 통과
- [ ] 로그 체크(E) 통과
- [ ] 문서 동기화: `CLAUDE.md` Recent Changes / 본 스펙 디렉토리 최신화
