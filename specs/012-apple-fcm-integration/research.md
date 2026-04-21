# Phase 0 Research: 애플 기기 FCM 연동

**Date**: 2026-04-21
**Branch**: `012-apple-fcm-integration`
**Scope**: spec.md의 FR/SC를 만족시키기 위해 필요한 외부 설정·패턴·의사결정 정리. 본 리서치를 통해 Technical Context의 남은 모호함을 모두 해소하고 Phase 1 설계를 진행한다.

---

## R-001. iOS APNs 인증 방식 (`.p8` Auth Key vs. Certificate)

- **Decision**: Apple Push Notification Auth Key (`.p8`)을 Firebase Console의 iOS 앱 설정 > Cloud Messaging 섹션에 업로드하여 사용한다. Certificate(`.p12`)는 사용하지 않는다.
- **Rationale**:
  - `.p8` 키는 팀 단위로 1회 발급하여 모든 번들 ID에 재사용 가능하고, 유효기간 만료가 없어 운영 부담이 낮다.
  - Apple 자체 문서 및 Firebase 권장이 Auth Key이며, HTTP/2 기반 APNs와의 호환성도 더 좋다.
- **Alternatives considered**:
  - Certificate 방식: 1년마다 갱신 필요, 번들 ID마다 별도 발급 — 운영 부담으로 기각.
  - APNs 직접 연동(firebase 미사용): 이미 `firebase-admin` 기반 파이프라인이 존재하므로 재작성 비용이 과다. 기각.
- **Action items(인프라, 본 PR 범위 외)**: Apple Developer > Certificates, IDs & Profiles > Keys 에서 "APNs" 권한의 `.p8` 키 1개 발급 → Key ID/Team ID와 함께 Firebase Console 업로드. 코드 변경 없음.

## R-002. iOS 엔터타이틀먼트 및 Capability 구성

- **Decision**: `frontend.entitlements`에 `aps-environment`(development 또는 production)를 추가한다. Expo prebuild 재생성 시 덮어써지지 않도록 **`app.json`의 `ios.entitlements` 블록 또는 config plugin**으로 주입한다. 수동 `frontend.entitlements` 편집은 최후의 수단으로만 사용.
- **Rationale**:
  - 현재 파일은 `<dict/>`로 비어 있어 Push Notifications capability가 꺼진 상태다. iOS 빌드 시 `aps-environment` 키가 없으면 APNs 토큰 등록 자체가 실패한다.
  - Expo는 `expo prebuild`로 네이티브 파일을 재생성하므로 Info.plist/entitlements의 수동 편집은 유실 위험이 있다. `app.json`의 `ios.entitlements` 설정으로 멱등성을 보장한다.
- **Alternatives considered**:
  - `withInfoPlist`/`withEntitlementsPlist` 커스텀 config plugin 작성: 동작은 같지만 본 기능은 정적 값 하나만 추가하면 충분하므로 `app.json` 네이티브 지원으로 처리. 추후 조건부 값 필요 시 plugin으로 전환.
  - iOS Xcode에서 GUI로 capability 추가: prebuild가 초기화하므로 단기 대응조차 불안정. 기각.
- **Action items(본 PR 범위)**: `frontend/app.json`의 `ios` 섹션에 `"entitlements": { "aps-environment": "development" }` 추가. TestFlight/AppStore 빌드는 EAS 프로파일에서 `production`으로 오버라이드하거나, 기본값을 `development`로 두되 EAS 빌드 설정에서 전환 문서화.

## R-003. 알림 탭 → 화면 이동 (Deep Link 라우팅)

- **Decision**: `@react-native-firebase/messaging`의 `getInitialNotification()`(종료 상태) + `onNotificationOpenedApp()`(백그라운드)로 알림 payload의 `data.type`(`'PLAN' | 'REVIEW'`)을 읽어 `@react-navigation`의 `navigationRef`로 메인 탭의 해당 모드로 진입시킨다. 전용 라우터 훅 `notificationTapRouter.ts`(또는 내부 함수)로 분리.
- **Rationale**:
  - 이미 `send-notification.usecase.ts`가 payload에 `{ type }`을 포함해 보낸다. 프론트는 기존 payload 구조만 해석하면 되며 백엔드 변경 불필요.
  - `navigationRef` 기반 전역 이동 API는 React Navigation v6+에서 공식 지원되어 로그인/로그아웃 상태 전환과 독립적으로 동작한다.
- **Alternatives considered**:
  - URL scheme 기반 deep link: iOS에서 APNs 탭 시 URL을 생성하려면 `click_action` 또는 별도 payload가 필요하여 백엔드 수정이 발생. 기각(현 스코프 최소화).
  - `notifee` 라이브러리 도입: 기능은 풍부하나 본 기능은 기본 표시 알림만 다루므로 과도. 기각.
- **Action items(본 PR 범위)**: `frontend/src/features/notification/notificationTapRouter.ts` 신설. `AuthNavigator` 마운트 시 `getInitialNotification`/`onNotificationOpenedApp` 구독하여 `navigationRef.navigate('Main', { screen: 'Home', params: { mode } })` 호출. `mode === 'REVIEW'` 일 때만 `modeOverride='REVIEW'`로 시작하도록 Main 라우트 파라미터 확장.

## R-004. 다기기(iPhone+iPad) 공존 가능성 — 기존 `upsertDevice` 규칙 재검토

- **Decision**: `UserDeviceRepository.upsertDevice`의 "같은 (userId, deviceType) 다른 토큰 일괄 soft-delete" 규칙을 **`(userId, deviceType, deviceName)` 3-tuple 기준으로 완화**한다. `deviceName`이 제공되지 않은 경우 현재 동작(동일 deviceType 내 1개 활성 유지)을 유지한다. 프론트 훅은 `Device.modelName`(expo-device) 또는 fallback `Platform.OS + Device.osBuildId`로 `deviceName`을 채워 보낸다.
- **Rationale**:
  - FR-004(사용자가 iPhone과 iPad 모두 알림 수신)는 현재 upsert 규칙과 충돌한다. 새 iOS 기기 로그인이 직전 iOS 기기의 토큰을 soft-delete하기 때문.
  - 그러나 무조건 공존을 허용하면 "앱 재설치 시 구 토큰 정리"(현 규칙의 원래 목적: 죽은 토큰으로의 헛발송 방지)가 깨진다. 앱 재설치의 경우 OS가 토큰을 회전시키되 `deviceName`은 동일하므로, `deviceName` 기준 soft-delete가 원래 의도를 유지하면서 다기기를 허용한다.
  - `deviceName` 미제공 시 기존 동작을 유지하면 Android 경로의 동작 변경 없음(회귀 방지: SC-004).
- **Alternatives considered**:
  - 새 컬럼 `device_identifier`(UUID) 추가: 스키마 변경이 필요하여 본 스코프(assumption "스키마 변경 없음") 위반. 기각.
  - 기존 규칙을 전면 철회하고 영구 실패 코드(`registration-token-not-registered`)만으로 정리: 발송 시점까지 죽은 토큰을 유지하며 최초 발송에서 반드시 1회 실패가 발생 → 운영 로그 악화. 기각.
  - `UNIQUE (userId, deviceType)` 도입: FR-004와 정면 충돌. 기각.
- **Action items(본 PR 범위)**:
  - `UserDeviceRepository.upsertDevice`의 soft-delete WHERE 절에 `device_name = :deviceName`를 추가(단, `deviceName`이 null/undefined이면 기존 WHERE 유지).
  - 프론트 `usePushNotification`에서 `deviceName`(모델명) 수집 후 `registerDevice` 호출에 동봉.
  - 해당 로직을 검증하는 유닛 테스트 추가(iPhone+iPad 공존, 동일 기기 토큰 갱신, Android 단일성 회귀).

### `Device.modelName` 결측 시 fallback 정책

- **결정**: iOS 실기기에서 `Device.modelName`(expo-device) 은 거의 항상 채워진다. 결측은 주로 시뮬레이터·일부 TestFlight 초기화 직후에 발생한다. 결측 시 `deviceName` 을 **생략**(undefined 전송)하여 백엔드 `upsertDevice` 의 기존 `(userId, deviceType)` 규칙으로 fallback 한다. 즉 그 경우 다기기 공존이 유지되지 않는 것을 **수용 가능한 엣지**로 간주한다.
- **근거**: (a) 다기기 공존은 실기기 사용자에 한해 의미가 있고 실기기에서는 `modelName` 이 채워진다. (b) SecureStore 기반 persistent UUID 도입은 신규 저장 경로·개인정보 처리 범위 확장이라 스코프 대비 비용이 높다. (c) 현재 단일 사용자당 활성 iOS 기기 수 중앙값이 1 대 수준이라 운영 영향이 작다.
- **Alternatives considered**:
  - SecureStore 에 최초 1회 UUID 생성·저장하여 `deviceName` fallback: 기능은 완전해지나 저장 경로·초기화 경로·초기 로그인 타이밍 이슈를 새로 추가. 본 PR 범위 초과로 기각(후속 이슈로 분리 가능).
  - `Application.applicationId + Platform.Version` 같은 파생 문자열 사용: 기기별 고유성이 없어 iPhone/iPad 공존 문제를 해결하지 못함. 기각.
- **Action items**: 프런트 hook 에 "modelName 결측 시 deviceName 생략" 경로의 주석(`WHY`) 을 남기고, 스펙 FR-004 의 실효 제약을 본 리서치 결정으로 문서화.

## R-005. iOS 시뮬레이터에서의 푸시

- **Decision**: iOS 16+ 시뮬레이터는 Xcode 14+에서 원격 푸시 일부를 지원하지만, APNs 토큰 획득이 간헐적으로 실패한다. 권한/토큰 획득에 실패해도 앱이 크래시하거나 재시도 폭주하지 않도록 현재 `usePushNotification`의 try/catch 내 "조용히 스킵" 패턴을 유지한다. Maestro E2E는 시뮬레이터에서 **권한 팝업 수락 및 토큰 등록 API 호출 관찰**까지만 커버하고, 실제 알림 수신은 실기기/TestFlight에서 수동 검증한다.
- **Rationale**:
  - 시뮬레이터의 푸시 동작이 불안정하면 CI에서 간헐적 실패를 유발한다. E2E 테스트가 "알림이 실제로 도달하는지"까지 검증하려 하면 가짜 실패가 많아진다.
  - `onRegisterDevice` 호출 여부는 토큰 획득 성공/실패로 관찰 가능하므로 E2E 커버리지 손실은 제한적이다.
- **Alternatives considered**:
  - `.apns` 파일을 시뮬레이터에 `xcrun simctl push`로 주입: 실제 APNs→FCM 경로가 아니어서 회귀 검증 가치가 낮다. 수동 smoke에만 활용 검토.
- **Action items(본 PR 범위)**: Maestro YAML은 `extendedWaitUntil` 후 "토큰 등록 완료" 로그/네트워크를 확인. 실기기 검증 절차는 quickstart.md에 기록.

## R-006. 로그 민감도(SC: FR-012 / FR of 011 유사)

- **Decision**: FCM 토큰은 기존 `substring(0, 8)` 프리픽스 규칙을 따른다. APNs `.p8`·Key ID·Team ID는 `ConfigService`로만 접근하며 **로그에 절대 기록하지 않는다**. Apple 개발자 계정 ID도 로깅 금지.
- **Rationale**: 기능 011에서 동일 원칙을 채택했고, 본 기능은 FCM 토큰 추가 수집이므로 동일 규칙을 연장 적용한다.
- **Alternatives considered**:
  - 토큰 해시 로깅: 디버깅 편의보다 유출 리스크가 커서 기각.
- **Action items**: 신규 코드(신규 router, 수정된 upsert) 리뷰 시 로그 출력 문자열에 토큰/Key ID 포함 여부 체크 항목을 PR 체크리스트에 넣는다.

## R-007. 백엔드 영구 실패 코드 커버리지

- **Decision**: 현 `send-notification.usecase.ts`의 `PERMANENT_FAILURE_CODES` 집합(`registration-token-not-registered`, `invalid-registration-token`, `mismatched-credential`)을 유지하고, iOS 특유의 APNs 에러(`Unregistered`, `BadDeviceToken`)는 `firebase-admin`이 FCM 계층에서 위 코드들로 정규화하므로 추가 매핑 불필요.
- **Rationale**:
  - `firebase-admin` v12+ 문서 기준 APNs 오류는 FCM 에러 코드로 정규화되어 클라이언트에 노출된다.
  - 커버리지가 충분하지 않으면 토큰 정리가 지연되어 SC-003(iOS 실패율 2% 이하) 달성이 어렵다. 현재 커버리지는 충분하다고 판단.
- **Alternatives considered**: `mismatched-credential` 외에 `sender-id-mismatch`, `third-party-auth-error` 도 포함 고려 → 발생 조건이 설정 오류여서 토큰 삭제 대상이 아님. 기각.
- **Action items**: 현 집합 유지. 본 PR에서 변경하지 않음. 관측 후 필요 시 별도 PR로 보강.

---

## 해소된 NEEDS CLARIFICATION 목록

Technical Context에는 NEEDS CLARIFICATION이 남아있지 않다. 본 리서치로 다루어야 했던 명시적 불확실성 4건(`aps-environment` 값, 다기기 공존 전략, 시뮬레이터 푸시, 알림 탭 라우팅)은 모두 위 R-002/R-004/R-005/R-003에서 결정되었다.
