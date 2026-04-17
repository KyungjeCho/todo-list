import { Injectable } from '@nestjs/common';
import { UserValidationService } from '../../common/services/user-validation.service';
import { GeminiService } from '../../ai/infrastructure/gemini.service';

interface RefineTextInput {
  userAuthId: string;
  text: string;
}

export interface RefineTextOutput {
  refinedText: string;
}

@Injectable()
export class RefineTextUsecase {
  constructor(
    private readonly userValidationService: UserValidationService,
    private readonly geminiService: GeminiService,
  ) {}

  async execute(input: RefineTextInput): Promise<RefineTextOutput> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    const refinedText = await this.geminiService.refineText(
      input.text,
      user.language,
    );

    return { refinedText };
  }
}
