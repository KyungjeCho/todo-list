import type { ImageSourcePropType } from 'react-native';
import type { OAuthProvider } from '../../types/user';

/**
 * OAuth 제공자별 브랜드 아이콘 카탈로그.
 *
 * WHY(FR-009, FR-010): 각 제공자의 공식 브랜드 가이드 준수 에셋을 `frontend/src/assets/oauth/`
 * 에 번들하고 여기서 `require()`로 연결한다. 파일이 추가되지 않은 제공자는 `undefined`로
 * 남겨 두면 `OAuthProviderButton`이 텍스트-only로 안전 폴백한다.
 */
export const OAUTH_ICONS: Partial<Record<OAuthProvider, ImageSourcePropType>> =
  {
    google: require('../../assets/oauth/google.png') as ImageSourcePropType,
    naver: require('../../assets/oauth/naver.png') as ImageSourcePropType,
    kakao: require('../../assets/oauth/kakao.png') as ImageSourcePropType,
    apple: require('../../assets/oauth/apple.png') as ImageSourcePropType,
  };
