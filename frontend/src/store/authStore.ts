import { create } from 'zustand';
import type { UserProfile } from '../types/user';
import { TokenManager, secureTokenStorage } from '../services/api/tokenManager';
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

  // WHY: On app launch, tokens are restored from secure storage so returning users
  // skip the login screen; if the stored token is invalid, we clear it to force re-auth.
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

/** Zustand selectors — 개별 필드 구독으로 불필요한 리렌더 방지 */
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectIsLoading = (s: AuthState) => s.isLoading;
export const selectUser = (s: AuthState) => s.user;
export const selectRefreshToken = (s: AuthState) => s.refreshToken;
export const selectSetUser = (s: AuthState) => s.setUser;
export const selectClearAuth = (s: AuthState) => s.clearAuth;
