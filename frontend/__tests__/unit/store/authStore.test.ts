import { useAuthStore } from 'src/store/authStore';
import { userApi } from 'src/services/api/userApi';
import type { UserProfile } from 'src/types/user';

jest.mock('src/services/api/userApi', () => ({
  userApi: {
    getProfile: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

const mockedUserApi = userApi as jest.Mocked<typeof userApi>;

describe('AuthStore', () => {
  const mockUser: UserProfile = {
    id: 'user-uuid-1',
    userName: '테스트유저',
    planTime: '08:00',
    reviewTime: '22:00',
    timezone: 'Asia/Seoul',
    language: 'ko-KR',
  };

  beforeEach(() => {
    // Zustand 스토어 초기화
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('초기 상태', () => {
    it('accessToken이 null이다', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
    });

    it('refreshToken이 null이다', () => {
      const state = useAuthStore.getState();
      expect(state.refreshToken).toBeNull();
    });

    it('user가 null이다', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('isAuthenticated가 false이다', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('isLoading이 false이다', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('accessToken과 refreshToken을 설정한다', () => {
      useAuthStore.getState().setTokens('access-123', 'refresh-456');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
    });

    it('isAuthenticated를 true로 전환한다', () => {
      useAuthStore.getState().setTokens('access-123', 'refresh-456');

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('setUser', () => {
    it('사용자 프로필을 설정한다', () => {
      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('기존 사용자 프로필을 덮어쓴다', () => {
      useAuthStore.getState().setUser(mockUser);

      const updatedUser: UserProfile = {
        ...mockUser,
        userName: '업데이트유저',
      };
      useAuthStore.getState().setUser(updatedUser);

      expect(useAuthStore.getState().user?.userName).toBe('업데이트유저');
    });
  });

  describe('clearAuth (로그아웃)', () => {
    it('모든 인증 상태를 초기화한다', () => {
      // 로그인 상태 설정
      useAuthStore.getState().setTokens('access-123', 'refresh-456');
      useAuthStore.getState().setUser(mockUser);

      // 로그아웃
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('로딩 상태를 true로 설정할 수 있다', () => {
      useAuthStore.getState().setLoading(true);

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('로딩 상태를 false로 설정할 수 있다', () => {
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setLoading(false);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('상태 전이 시나리오', () => {
    it('로그인 → 프로필 설정 → 로그아웃 전체 흐름', () => {
      const { setTokens, setUser, clearAuth } = useAuthStore.getState();

      // 1. 로그인
      setTokens('access-token', 'refresh-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // 2. 프로필 설정
      setUser(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);

      // 3. 로그아웃
      clearAuth();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('토큰 갱신 시 기존 사용자 프로필이 유지된다', () => {
      const { setTokens, setUser } = useAuthStore.getState();

      // 초기 로그인
      setTokens('old-access', 'old-refresh');
      setUser(mockUser);

      // 토큰 갱신
      setTokens('new-access', 'new-refresh');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access');
      expect(state.refreshToken).toBe('new-refresh');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('restoreTokens', () => {
    it('토큰 복원 성공 시 사용자 프로필도 함께 복원한다', async () => {
      const { tokenManager } = await import('src/store/authStore');
      jest.spyOn(tokenManager, 'getAccessToken').mockResolvedValue('saved-access');
      jest.spyOn(tokenManager, 'getRefreshToken').mockResolvedValue('saved-refresh');
      mockedUserApi.getProfile.mockResolvedValue(mockUser);

      await useAuthStore.getState().restoreTokens();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(mockedUserApi.getProfile).toHaveBeenCalled();
    });

    it('프로필 조회 실패 시 인증 상태를 초기화한다', async () => {
      const { tokenManager } = await import('src/store/authStore');
      jest.spyOn(tokenManager, 'getAccessToken').mockResolvedValue('saved-access');
      jest.spyOn(tokenManager, 'getRefreshToken').mockResolvedValue('saved-refresh');
      const clearSpy = jest.spyOn(tokenManager, 'clearTokens').mockResolvedValue();
      mockedUserApi.getProfile.mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().restoreTokens();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('저장된 토큰이 없으면 프로필 조회를 시도하지 않는다', async () => {
      const { tokenManager } = await import('src/store/authStore');
      jest.spyOn(tokenManager, 'getAccessToken').mockResolvedValue(null);
      jest.spyOn(tokenManager, 'getRefreshToken').mockResolvedValue(null);
      mockedUserApi.getProfile.mockClear();

      await useAuthStore.getState().restoreTokens();

      expect(mockedUserApi.getProfile).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
