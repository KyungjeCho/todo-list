import { GeminiService } from 'src/ai/infrastructure/gemini.service';
import { HttpException } from '@nestjs/common';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-gemini-api-key'),
  getOrThrow: jest.fn().mockReturnValue('test-gemini-api-key'),
};

describe('GeminiService - refineText', () => {
  let service: GeminiService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new GeminiService(mockConfigService as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('refineText', () => {
    it('텍스트를 Gemini API에 전달하고 정리된 텍스트를 반환한다', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '내일까지 장보기',
        },
      });

      const result = await service.refineText('장보기 가야 돼 내일까지');

      expect(result).toBe('내일까지 장보기');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('Gemini API가 빈 응답을 반환하면 원본 텍스트를 반환한다', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '',
        },
      });

      const result = await service.refineText('장보기 가야 돼');

      expect(result).toBe('장보기 가야 돼');
    });

    it('429 에러 시 최대 3회 retry 후 성공한다', async () => {
      const rateLimitError = { status: 429 };
      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          response: {
            text: () => '장보기',
          },
        });

      const promise = service.refineText('장보기 해야지');

      // WHY: refineText 내부에서 429 retry 시 setTimeout(delay)를 사용하므로 타이머를 진행시켜야 함
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      const result = await promise;

      expect(result).toBe('장보기');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('429 에러 3회 retry 후에도 실패하면 VOICE_AI_RATE_LIMIT 에러를 throw한다', async () => {
      const rateLimitError = { status: 429 };
      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError);

      const promise = service.refineText('장보기');

      // WHY: 각 retry 사이의 delay를 진행시킴 (attempt * 2000ms)
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
        jest.advanceTimersByTime(4000);
        await Promise.resolve();
      }

      await expect(promise).rejects.toThrow(HttpException);

      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('일반 에러 시 VOICE_AI_API_ERROR 에러를 throw한다', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API failure'));

      try {
        await service.refineText('장보기');
        fail('Expected HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toEqual(
          expect.objectContaining({ code: 'VOICE_AI_API_ERROR' }),
        );
      }
    });

    it('정리된 텍스트의 앞뒤 공백을 제거한다', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '  장보기  ',
        },
      });

      const result = await service.refineText('장보기 해야 돼');

      expect(result).toBe('장보기');
    });
  });
});
