import * as SecureStore from 'expo-secure-store';
import type { TokenRefreshResponse } from '../../types/user';

export interface TokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const secureTokenStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export class TokenManager {
  private storage: TokenStorage;
  private refreshPromise: Promise<TokenRefreshResponse | null> | null = null;

  constructor(storage: TokenStorage) {
    this.storage = storage;
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.storage.setItem('accessToken', accessToken);
    await this.storage.setItem('refreshToken', refreshToken);
  }

  async getAccessToken(): Promise<string | null> {
    return this.storage.getItem('accessToken');
  }

  async getRefreshToken(): Promise<string | null> {
    return this.storage.getItem('refreshToken');
  }

  async clearTokens(): Promise<void> {
    await this.storage.removeItem('accessToken');
    await this.storage.removeItem('refreshToken');
  }

  async refreshTokens(
    refreshFn: (refreshToken: string) => Promise<TokenRefreshResponse>,
  ): Promise<TokenRefreshResponse | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh(refreshFn);

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(
    refreshFn: (refreshToken: string) => Promise<TokenRefreshResponse>,
  ): Promise<TokenRefreshResponse | null> {
    const currentRefreshToken = await this.getRefreshToken();

    if (!currentRefreshToken) {
      return null;
    }

    try {
      const result = await refreshFn(currentRefreshToken);
      await this.saveTokens(result.accessToken, result.refreshToken);
      return result;
    } catch (error) {
      await this.clearTokens();
      throw error;
    }
  }
}
