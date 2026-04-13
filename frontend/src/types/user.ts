import type { SupportedLanguage } from 'src/i18n';

export interface UserProfile {
  id: string;
  userName: string;
  planTime: string | null;
  reviewTime: string | null;
  timezone: string | null;
  language: SupportedLanguage;
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
