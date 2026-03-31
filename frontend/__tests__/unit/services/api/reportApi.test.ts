import { apiClient, ApiError } from 'src/services/api/client';
import { reportApi } from 'src/services/api/reportApi';

jest.mock('src/services/api/client', () => {
  class MockApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly timestamp: string;
    constructor(statusCode: number, code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.code = code;
      this.timestamp = new Date().toISOString();
    }
  }
  return {
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
    ApiError: MockApiError,
  };
});

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

const mockMonthlySummaryResponse = {
  year: 2026,
  month: 3,
  days: [
    { date: '2026-03-01', totalCount: 3, completedCount: 2, activeCount: 1, carriedOverCount: 0 },
    { date: '2026-03-05', totalCount: 1, completedCount: 1, activeCount: 0, carriedOverCount: 0 },
    { date: '2026-03-15', totalCount: 5, completedCount: 3, activeCount: 2, carriedOverCount: 0 },
  ],
};

describe('ReportApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlySummary', () => {
    it('year, month를 쿼리 파라미터로 전달하여 월별 요약을 조회한다', async () => {
      mockedClient.get.mockResolvedValue({ data: mockMonthlySummaryResponse });

      const result = await reportApi.getMonthlySummary(2026, 3);

      expect(mockedClient.get).toHaveBeenCalledWith('/todos/report/summary', {
        params: { year: 2026, month: 3 },
      });
      expect(result).toEqual(mockMonthlySummaryResponse);
    });

    it('빈 월 데이터를 정상적으로 반환한다', async () => {
      const emptyResponse = {
        year: 2026,
        month: 4,
        days: [],
      };
      mockedClient.get.mockResolvedValue({ data: emptyResponse });

      const result = await reportApi.getMonthlySummary(2026, 4);

      expect(result.days).toHaveLength(0);
      expect(result.year).toBe(2026);
      expect(result.month).toBe(4);
    });

    it('API 에러 시 예외를 전파한다', async () => {
      mockedClient.get.mockRejectedValue(new Error('Network Error'));

      await expect(reportApi.getMonthlySummary(2026, 3)).rejects.toThrow(
        'Network Error',
      );
    });
  });

  describe('HTTP 상태별 에러 매핑', () => {
    it('400 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(
        400,
        'BAD_REQUEST',
        '유효하지 않은 파라미터입니다',
      );
      mockedClient.get.mockRejectedValue(error);

      await expect(reportApi.getMonthlySummary(2026, 13)).rejects.toMatchObject(
        {
          statusCode: 400,
          code: 'BAD_REQUEST',
        },
      );
    });

    it('401 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      mockedClient.get.mockRejectedValue(error);

      await expect(reportApi.getMonthlySummary(2026, 3)).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('404 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(
        404,
        'USER_NOT_FOUND',
        '사용자를 찾을 수 없습니다',
      );
      mockedClient.get.mockRejectedValue(error);

      await expect(reportApi.getMonthlySummary(2026, 3)).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    it('500 에러 시 ApiError로 전파된다', async () => {
      const error = new ApiError(
        500,
        'INTERNAL_SERVER_ERROR',
        '서버 내부 오류입니다',
      );
      mockedClient.get.mockRejectedValue(error);

      await expect(reportApi.getMonthlySummary(2026, 3)).rejects.toMatchObject({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
      });
    });
  });

  describe('다양한 월 파라미터 전송', () => {
    it('1월 데이터를 조회한다', async () => {
      mockedClient.get.mockResolvedValue({
        data: { year: 2026, month: 1, days: [] },
      });

      await reportApi.getMonthlySummary(2026, 1);

      expect(mockedClient.get).toHaveBeenCalledWith('/todos/report/summary', {
        params: { year: 2026, month: 1 },
      });
    });

    it('12월 데이터를 조회한다', async () => {
      mockedClient.get.mockResolvedValue({
        data: { year: 2026, month: 12, days: [] },
      });

      await reportApi.getMonthlySummary(2026, 12);

      expect(mockedClient.get).toHaveBeenCalledWith('/todos/report/summary', {
        params: { year: 2026, month: 12 },
      });
    });
  });
});
