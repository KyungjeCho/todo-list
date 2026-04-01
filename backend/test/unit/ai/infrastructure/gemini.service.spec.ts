import { GeminiService } from 'src/ai/infrastructure/gemini.service';
import { HttpException, HttpStatus } from '@nestjs/common';

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

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GeminiService(mockConfigService as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transcribeAndRefine', () => {
    it('오디오 Buffer를 Gemini API에 전달하고 변환된 텍스트를 반환한다', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const mimeType = 'audio/wav';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '장보기',
        },
      });

      const result = await service.transcribeAndRefine(audioBuffer, mimeType);

      expect(result).toBe('장보기');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            inlineData: expect.objectContaining({
              mimeType: 'audio/wav',
            }),
          }),
          expect.any(String),
        ]),
      );
    });

    it('m4a 오디오 포맷을 지원한다', async () => {
      const audioBuffer = Buffer.from('fake-m4a-data');
      const mimeType = 'audio/mp4';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '운동하기',
        },
      });

      const result = await service.transcribeAndRefine(audioBuffer, mimeType);

      expect(result).toBe('운동하기');
    });

    it('mp3 오디오 포맷을 지원한다', async () => {
      const audioBuffer = Buffer.from('fake-mp3-data');
      const mimeType = 'audio/mpeg';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '독서하기',
        },
      });

      const result = await service.transcribeAndRefine(audioBuffer, mimeType);

      expect(result).toBe('독서하기');
    });

    it('지원하지 않는 오디오 포맷이면 INVALID_AUDIO_FORMAT 에러를 throw한다', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const mimeType = 'audio/ogg';

      await expect(
        service.transcribeAndRefine(audioBuffer, mimeType),
      ).rejects.toThrow(HttpException);

      await expect(
        service.transcribeAndRefine(audioBuffer, mimeType),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INVALID_AUDIO_FORMAT',
        }),
      });
    });

    it('Gemini API 호출 실패 시 VOICE_AI_API_ERROR 에러를 throw한다', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const mimeType = 'audio/wav';

      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      await expect(
        service.transcribeAndRefine(audioBuffer, mimeType),
      ).rejects.toThrow(HttpException);

      await expect(
        service.transcribeAndRefine(audioBuffer, mimeType),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'VOICE_AI_API_ERROR',
        }),
      });
    });

    it('Gemini API가 빈 텍스트를 반환하면 에러를 throw한다', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const mimeType = 'audio/wav';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '',
        },
      });

      await expect(
        service.transcribeAndRefine(audioBuffer, mimeType),
      ).rejects.toThrow(HttpException);
    });

    it('변환된 텍스트의 앞뒤 공백을 제거한다', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const mimeType = 'audio/wav';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '  장보기  ',
        },
      });

      const result = await service.transcribeAndRefine(audioBuffer, mimeType);

      expect(result).toBe('장보기');
    });

    it('오디오 데이터를 base64로 인코딩하여 API에 전달한다', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      const mimeType = 'audio/wav';
      const expectedBase64 = audioBuffer.toString('base64');

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '할 일',
        },
      });

      await service.transcribeAndRefine(audioBuffer, mimeType);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            inlineData: expect.objectContaining({
              data: expectedBase64,
            }),
          }),
        ]),
      );
    });
  });
});
