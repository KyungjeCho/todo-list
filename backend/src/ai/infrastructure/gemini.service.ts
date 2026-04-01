import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/mp4',
  'audio/mpeg',
];

const TRANSCRIBE_PROMPT =
  '이 오디오를 듣고 사용자가 말한 할 일(todo)을 간결한 한국어 문장으로 정리해줘. 부연 설명 없이 할 일 내용만 반환해.';

@Injectable()
export class GeminiService {
  private readonly model;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('ai.geminiApiKey');
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async transcribeAndRefine(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (!SUPPORTED_AUDIO_MIME_TYPES.includes(mimeType)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'INVALID_AUDIO_FORMAT',
          message: `지원하지 않는 오디오 포맷입니다: ${mimeType}. wav, m4a, mp3만 지원합니다.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent([
          {
            inlineData: {
              mimeType,
              data: audioBuffer.toString('base64'),
            },
          },
          TRANSCRIBE_PROMPT,
        ]);

        const text = result.response.text().trim();

        if (!text) {
          throw new HttpException(
            {
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              code: 'VOICE_AI_API_ERROR',
              message: '음성에서 텍스트를 추출할 수 없습니다.',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        return text;
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }

        // WHY: Gemini 무료 tier는 분당 요청 수 제한이 있어 429가 자주 발생함
        const status = (error as { status?: number }).status;
        if (status === 429 && attempt < maxRetries) {
          const delay = attempt * 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (status === 429) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              code: 'VOICE_AI_RATE_LIMIT',
              message:
                'AI 서비스 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        throw new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            code: 'VOICE_AI_API_ERROR',
            message: 'Gemini API 호출에 실패했습니다.',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'VOICE_AI_API_ERROR',
        message: 'Gemini API 호출에 실패했습니다.',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
