import type { SupportedLanguage } from 'src/i18n';

export interface UserProfile {
  id: string;
  userName: string;
  planTime: string | null;
  reviewTime: string | null;
  timezone: string | null;
  /** 서버에서 legacy 형식(ko-KR)이 올 수 있으므로 string으로 수신, UI에서 normalizeLanguage()로 정규화 */
  language: string;
}

export interface UpdateSettingsRequest {
  userName?: string;
  planTime?: string | null;
  reviewTime?: string | null;
  timezone?: string;
  language?: SupportedLanguage;
}

export type OAuthProvider = 'google' | 'naver' | 'kakao' | 'apple';

export type DeviceType = 'IOS' | 'ANDROID';

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
  fcmToken: string;
}
