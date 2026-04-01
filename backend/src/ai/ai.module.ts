import { Module } from '@nestjs/common';
import { GeminiService } from './infrastructure/gemini.service';

@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class AiModule {}
