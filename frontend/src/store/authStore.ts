import { create } from 'zustand';
import type { UserProfile } from '../types/user';
import {
  TokenManager,
  secureTokenStorage,
} from '../services/api/tokenManager';
import { userApi } from '../services/api/userApi';

export const tokenManager = new TokenManager(secureTokenStorage);

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: UserProfile) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  restoreTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setTokens: async (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
    await tokenManager.saveTokens(accessToken, refreshToken);
  },

  setUser: (user) => set({ user }),

  clearAuth: () => {
    tokenManager.clearTokens();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  restoreTokens: async () => {
    const accessToken = await tokenManager.getAccessToken();
    const refreshToken = await tokenManager.getRefreshToken();
    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, isAuthenticated: true });
      try {
        const user = await userApi.getProfile();
        set({ user });
      } catch {
        tokenManager.clearTokens();
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      }
    }
  },
}));
