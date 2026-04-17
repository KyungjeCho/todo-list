import { Injectable, BadRequestException } from '@nestjs/common';
import { TodoRepository } from '../infrastructure/todo.repository';
import { UserValidationService } from '../../common/services/user-validation.service';
import { TodoAuthorizationService } from './services/todo-authorization.service';
import { TodoItemMapper } from './mappers/todo-item.mapper';
import { TodoStatus } from '../domain/todo.entity';
import type { TodoItemDto } from './dto/todo-response.dto';

interface ChangeTodoStatusInput {
  userAuthId: string;
  todoId: string;
  status: string;
}

@Injectable()
export class ChangeTodoStatusUsecase {
  constructor(
    private readonly todoRepository: TodoRepository,
    private readonly userValidationService: UserValidationService,
    private readonly todoAuthorizationService: TodoAuthorizationService,
  ) {}

  async execute(input: ChangeTodoStatusInput): Promise<TodoItemDto> {
    const user = await this.userValidationService.ensureUserExists(
      input.userAuthId,
    );

    // WHY: CARRIED_OVER 상태는 시스템(이월 스케줄러)만 부여할 수 있는 내부 상태다.
    // 클라이언트가 직접 CARRIED_OVER로 전환하면 이월 히스토리 없이 상태만 바뀌어
    // 데이터 정합성이 깨지므로 API 레벨에서 차단한다.
    if (input.status === (TodoStatus.CARRIED_OVER as string)) {
      throw new BadRequestException('CARRIED_OVER_NOT_ALLOWED');
    }

    const todo = await this.todoAuthorizationService.validateOwnership(
      input.todoId,
      user.id,
    );

    // WHY: input.status는 DTO 유효성 검증을 통과한 문자열이지만 타입 시스템상 string이다.
    // changeStatus 내부에서 유효하지 않은 전이를 도메인 규칙으로 거부하므로 안전하게 캐스팅한다.
    todo.changeStatus(input.status as TodoStatus);

    const updated = await this.todoRepository.update({
      ...todo,
      id: input.todoId,
      updatedBy: user.id,
    });

    return TodoItemMapper.toDto(updated);
  }
}
