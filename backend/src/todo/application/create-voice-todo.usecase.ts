import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserRepository } from '../../user/infrastructure/user.repository';
import { GeminiService } from '../../ai/infrastructure/gemini.service';
import { TodoStatus } from '../domain/todo.entity';
import type { VoiceTodoResponseDto } from './dto/voice-todo.dto';

interface CreateVoiceTodoInput {
  userAuthId: string;
  audioBuffer: Buffer;
  mimeType: string;
  todoDate: string;
}

@Injectable()
export class CreateVoiceTodoUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userRepository: UserRepository,
    private readonly geminiService: GeminiService,
  ) {}

  async execute(input: CreateVoiceTodoInput): Promise<VoiceTodoResponseDto> {
    const user = await this.userRepository.findByUserAuthId(input.userAuthId);
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const rawText = await this.geminiService.transcribeAndRefine(
      input.audioBuffer,
      input.mimeType,
    );

    if (!rawText || rawText.trim().length === 0) {
      throw new BadRequestException('CONTENT_REQUIRED');
    }

    if (rawText.length > 255) {
      throw new BadRequestException('CONTENT_TOO_LONG');
    }

    const todo = await this.todoRepository.create({
      userId: user.id,
      content: rawText,
      todoDate: input.todoDate,
      status: TodoStatus.ACTIVE,
      createdBy: user.id,
      updatedBy: user.id,
    });

    const memos = (
      (todo.memos as {
        id: string;
        todoId: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
      }[]) ?? []
    ).map((memo) => ({
      id: memo.id,
      todoId: memo.todoId,
      content: memo.content,
      createdAt: new Date(memo.createdAt).toISOString(),
      updatedAt: new Date(memo.updatedAt).toISOString(),
    }));

    return {
      id: todo.id,
      content: todo.content,
      rawText,
      status: todo.status,
      isCarriedOver: false,
      todoDate: todo.todoDate,
      memos,
      createdAt: new Date(todo.createdAt).toISOString(),
      updatedAt: new Date(todo.updatedAt).toISOString(),
    };
  }
}
