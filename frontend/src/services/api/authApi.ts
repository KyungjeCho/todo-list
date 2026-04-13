import { apiClient } from './client';
import config from '../config';
import type {
  OAuthProvider,
  DeviceType,
  TokenRefreshResponse,
} from '../../types/user';

export const authApi = {
  getOAuthUrl(
    provider: OAuthProvider,
    fcmToken: string | null,
    deviceType: DeviceType,
    redirectUri: string,
    deviceName?: string,
    timezone?: string,
    language?: string,
  ): string {
    const params = new URLSearchParams({
      deviceType,
      redirectUri,
    });
    if (fcmToken) {
      params.set('fcmToken', fcmToken);
    }
    if (deviceName) {
      params.set('deviceName', deviceName);
    }
    if (timezone) {
      params.set('timezone', timezone);
    }
    if (language) {
      params.set('language', language);
    }
    return `${config.apiBaseUrl}/auth/oauth/${provider}?${params.toString()}`;
  },

  async refreshToken(refreshToken: string): Promise<TokenRefreshResponse> {
    const response = await apiClient.post('/auth/token/refresh', {
      refreshToken,
    });
    return response.data;
  },

  async logout(
    refreshToken: string,
    fcmToken: string | null,
  ): Promise<{ message: string }> {
    const body: { refreshToken: string; fcmToken?: string } = { refreshToken };
    if (fcmToken) body.fcmToken = fcmToken;
    const response = await apiClient.post('/auth/logout', body);
    return response.data;
  },
};
