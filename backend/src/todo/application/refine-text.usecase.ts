import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../user/infrastructure/user.repository';
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
    private readonly userRepository: UserRepository,
    private readonly geminiService: GeminiService,
  ) {}

  async execute(input: RefineTextInput): Promise<RefineTextOutput> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const refinedText = await this.geminiService.refineText(input.text);

    return { refinedText };
  }
}
