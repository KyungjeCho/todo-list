import { TokenManager } from 'src/services/api/tokenManager';

// SecureStore 또는 AsyncStorage mock
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('src/services/api/tokenManager', () => {
  const actual = jest.requireActual('src/services/api/tokenManager');
  return actual;
});

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenManager = new TokenManager(mockStorage);
  });

  describe('토큰 저장', () => {
    it('accessToken과 refreshToken을 저장한다', async () => {
      await tokenManager.saveTokens('access-123', 'refresh-456');

      expect(mockStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-123');
      expect(mockStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-456');
    });
  });

  describe('토큰 조회', () => {
    it('저장된 accessToken을 반환한다', async () => {
      mockStorage.getItem.mockResolvedValueOnce('access-123');

      const token = await tokenManager.getAccessToken();

      expect(token).toBe('access-123');
      expect(mockStorage.getItem).toHaveBeenCalledWith('accessToken');
    });

    it('저장된 refreshToken을 반환한다', async () => {
      mockStorage.getItem.mockResolvedValueOnce('refresh-456');

      const token = await tokenManager.getRefreshToken();

      expect(token).toBe('refresh-456');
      expect(mockStorage.getItem).toHaveBeenCalledWith('refreshToken');
    });

    it('토큰이 없으면 null을 반환한다', async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const token = await tokenManager.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('토큰 삭제', () => {
    it('모든 토큰을 삭제한다', async () => {
      await tokenManager.clearTokens();

      expect(mockStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('토큰 자동 갱신', () => {
    it('refreshToken으로 새로운 토큰을 요청한다', async () => {
      const mockRefreshFn = jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      mockStorage.getItem.mockResolvedValueOnce('old-refresh');

      const result = await tokenManager.refreshTokens(mockRefreshFn);

      expect(mockRefreshFn).toHaveBeenCalledWith('old-refresh');
      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });

    it('갱신 성공 시 새로운 토큰을 저장한다', async () => {
      const mockRefreshFn = jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      mockStorage.getItem.mockResolvedValueOnce('old-refresh');

      await tokenManager.refreshTokens(mockRefreshFn);

      expect(mockStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access');
      expect(mockStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh');
    });

    it('refreshToken이 없으면 null을 반환한다', async () => {
      const mockRefreshFn = jest.fn();
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await tokenManager.refreshTokens(mockRefreshFn);

      expect(result).toBeNull();
      expect(mockRefreshFn).not.toHaveBeenCalled();
    });

    it('갱신 실패 시 에러를 throw한다', async () => {
      const mockRefreshFn = jest.fn().mockRejectedValue(new Error('Token expired'));
      mockStorage.getItem.mockResolvedValueOnce('old-refresh');

      await expect(tokenManager.refreshTokens(mockRefreshFn)).rejects.toThrow('Token expired');
    });
  });

  describe('만료 처리', () => {
    it('갱신 실패 시 저장된 토큰을 삭제한다', async () => {
      const mockRefreshFn = jest.fn().mockRejectedValue(new Error('Token expired'));
      mockStorage.getItem.mockResolvedValueOnce('old-refresh');

      try {
        await tokenManager.refreshTokens(mockRefreshFn);
      } catch {
        // expected
      }

      expect(mockStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('동시 갱신 방지', () => {
    it('동시에 여러 갱신 요청이 들어와도 한 번만 갱신한다', async () => {
      const mockRefreshFn = jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      mockStorage.getItem.mockResolvedValue('old-refresh');

      const [result1, result2] = await Promise.all([
        tokenManager.refreshTokens(mockRefreshFn),
        tokenManager.refreshTokens(mockRefreshFn),
      ]);

      expect(mockRefreshFn).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });
  });
});
