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
    fcmToken: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/logout', {
      refreshToken,
      fcmToken,
    });
    return response.data;
  },
};
