import { userApi } from 'src/services/api/userApi';
import { apiClient } from 'src/services/api/client';
import type { UserProfile, UpdateSettingsRequest } from 'src/types/user';

jest.mock('src/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    statusCode: number;
    code: string;
    timestamp: string;
    constructor(statusCode: number, code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.code = code;
      this.timestamp = new Date().toISOString();
    }
  },
}));

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

const mockUserProfile: UserProfile = {
  id: 'user-uuid-1',
  userName: '테스트유저',
  planTime: '08:00',
  reviewTime: '22:00',
  timezone: 'Asia/Seoul',
  language: 'ko',
  hasCompletedOnboarding: true,
};

describe('UserApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('현재 사용자 프로필을 조회한다', async () => {
      mockedClient.get.mockResolvedValueOnce({ data: mockUserProfile });

      const result = await userApi.getProfile();

      expect(mockedClient.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUserProfile);
    });

    it('프로필 조회 실패 시 에러를 전파한다', async () => {
      mockedClient.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(userApi.getProfile()).rejects.toThrow();
    });
  });

  describe('updateSettings', () => {
    it('사용자 설정을 부분 업데이트한다', async () => {
      const updateData: UpdateSettingsRequest = {
        planTime: '09:00',
        reviewTime: '21:00',
      };
      const updatedProfile: UserProfile = {
        ...mockUserProfile,
        planTime: '09:00',
        reviewTime: '21:00',
      };
      mockedClient.patch.mockResolvedValueOnce({ data: updatedProfile });

      const result = await userApi.updateSettings(updateData);

      expect(mockedClient.patch).toHaveBeenCalledWith(
        '/users/me/settings',
        updateData,
      );
      expect(result).toEqual(updatedProfile);
    });

    it('userName만 변경할 수 있다', async () => {
      const updateData: UpdateSettingsRequest = {
        userName: '새이름',
      };
      mockedClient.patch.mockResolvedValueOnce({
        data: { ...mockUserProfile, userName: '새이름' },
      });

      const result = await userApi.updateSettings(updateData);

      expect(mockedClient.patch).toHaveBeenCalledWith('/users/me/settings', {
        userName: '새이름',
      });
      expect(result.userName).toBe('새이름');
    });

    it('timezone을 변경할 수 있다', async () => {
      const updateData: UpdateSettingsRequest = {
        timezone: 'America/New_York',
      };
      mockedClient.patch.mockResolvedValueOnce({
        data: { ...mockUserProfile, timezone: 'America/New_York' },
      });

      const result = await userApi.updateSettings(updateData);

      expect(mockedClient.patch).toHaveBeenCalledWith('/users/me/settings', {
        timezone: 'America/New_York',
      });
      expect(result.timezone).toBe('America/New_York');
    });

    it('planTime을 null로 설정할 수 있다 (알림 해제)', async () => {
      const updateData: UpdateSettingsRequest = {
        planTime: null,
      };
      mockedClient.patch.mockResolvedValueOnce({
        data: { ...mockUserProfile, planTime: null },
      });

      const result = await userApi.updateSettings(updateData);

      expect(mockedClient.patch).toHaveBeenCalledWith('/users/me/settings', {
        planTime: null,
      });
      expect(result.planTime).toBeNull();
    });

    it('설정 변경 실패 시 에러를 전파한다', async () => {
      mockedClient.patch.mockRejectedValueOnce(new Error('Bad request'));

      await expect(userApi.updateSettings({ userName: '' })).rejects.toThrow();
    });
  });

  describe('시간 포맷 정규화 (HH:mm:ss ↔ HH:mm)', () => {
    it('getProfile 응답의 HH:mm:ss를 HH:mm으로 정규화한다', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: { ...mockUserProfile, planTime: '08:00:00', reviewTime: '22:30:00' },
      });

      const result = await userApi.getProfile();

      expect(result.planTime).toBe('08:00');
      expect(result.reviewTime).toBe('22:30');
    });

    it('updateSettings 요청의 HH:mm:ss를 HH:mm으로 정규화해 전송한다', async () => {
      mockedClient.patch.mockResolvedValueOnce({ data: mockUserProfile });

      await userApi.updateSettings({
        planTime: '08:00:00',
        reviewTime: '22:30:00',
      });

      expect(mockedClient.patch).toHaveBeenCalledWith('/users/me/settings', {
        planTime: '08:00',
        reviewTime: '22:30',
      });
    });

    it('updateSettings 응답도 정규화된다', async () => {
      mockedClient.patch.mockResolvedValueOnce({
        data: { ...mockUserProfile, planTime: '09:15:00' },
      });

      const result = await userApi.updateSettings({ planTime: '09:15' });

      expect(result.planTime).toBe('09:15');
    });

    it('planTime이 null이면 null로 유지한다', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: { ...mockUserProfile, planTime: null, reviewTime: null },
      });

      const result = await userApi.getProfile();

      expect(result.planTime).toBeNull();
      expect(result.reviewTime).toBeNull();
    });

    it('undefined 필드는 요청에 포함되지 않는다', async () => {
      mockedClient.patch.mockResolvedValueOnce({ data: mockUserProfile });

      await userApi.updateSettings({ userName: '새이름' });

      expect(mockedClient.patch).toHaveBeenCalledWith('/users/me/settings', {
        userName: '새이름',
      });
    });

    it('completeOnboarding 응답도 정규화된다', async () => {
      mockedClient.post.mockResolvedValueOnce({
        data: { ...mockUserProfile, planTime: '07:00:00', reviewTime: '23:00:00' },
      });

      const result = await userApi.completeOnboarding();

      expect(result.planTime).toBe('07:00');
      expect(result.reviewTime).toBe('23:00');
    });
  });
});
