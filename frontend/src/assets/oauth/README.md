# OAuth Provider Brand Icons

이 디렉터리에는 각 OAuth 제공자의 공식 브랜드 가이드 준수 아이콘 PNG/SVG를 추가한다.

## 필요한 파일

| Provider | 파일명       | 출처                                                                         |
|----------|--------------|------------------------------------------------------------------------------|
| google   | `google.png` | https://developers.google.com/identity/branding-guidelines                    |
| naver    | `naver.png`  | https://developers.naver.com/docs/login/bi/                                   |
| kakao    | `kakao.png`  | https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide          |
| apple    | `apple.png`  | https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple |

## 전략

- 라이트/다크 모드 공용 단일 컬러 아이콘을 기본 사용한다.
- 브랜드 가이드가 다크 변형을 요구하는 경우 `*-dark.png`를 추가하고 `OAuthProviderButton`에서 `useColorScheme()`으로 분기한다.
- 해상도: 44×44 px 기준(at-2x, at-3x를 원하면 Expo 에셋 해상도 접미사 사용).

## 동작

파일이 존재하지 않아도 `OAuthProviderButton`은 텍스트-only로 안전 폴백한다(FR-010). 에셋이 추가되면 `src/components/auth/oauthIconCatalog.ts`에서 `require()`로 연결한다.

## 현재 상태 (2026-04-15)

네 제공자 모두 공식 브랜드 에셋이 배치되어 `OAuthProviderButton`이 아이콘+텍스트로 렌더링한다.

| Provider | 파일 | 크기(px) | 가이드 적합성 |
|----------|------|---------|--------------|
| google   | `google.png` | 40×40 RGBA, 투명 배경 | ✅ 공식 G 로고. 커스텀 텍스트 버튼과 함께 G 로고 단독 사용 허용(Google Identity Branding). 색/모양 미변경. |
| naver    | `naver.png`  | 224×224 RGBA, 녹색 원 + 흰 N | ✅ Naver BI 공식 조합(배경 #03C75A, 흰색 N 심볼). 버튼 배경도 #03C75A라 원형 심볼이 자연스럽게 놓인다. |
| kakao    | `kakao.png`  | 34×35 RGBA, 노란 배경 + 검정 말풍선 | ✅ Kakao 디자인 가이드 "노란 배경(#FEE500) + 검정 말풍선" 기본 조합. 버튼 배경 #FEE500과 blend. |
| apple    | `apple.png`  | 64×64 RGBA, 검정 배경 + 흰 Apple 로고 | ✅ Apple HIG Sign in with Apple "black" 변형. 버튼 배경 `colors.onSurface`(#0F172A)와 색 계열이 일치. 로고 비율 미변경. |

가이드 핵심 준수 사항:

- 로고 색/비율/모양 임의 변경 금지 — 원본 그대로 사용
- 최소 여백: `OAuthProviderButton`은 20×20 아이콘 + 8px gap + 텍스트로 충분한 여백 확보
- 텍스트 라벨: 각 제공자 가이드가 요구하는 "Continue with {Provider}" 문구 사용(i18n 리소스 `auth.continueWith{Provider}`)
