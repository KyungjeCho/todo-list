/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TodoAuthorizationService } from '../../../../../src/todo/application/services/todo-authorization.service';
import { TodoRepository } from '../../../../../src/todo/infrastructure/todo.repository';
import { ERROR_CODES } from '../../../../../src/common/constants/error-codes';

describe('TodoAuthorizationService', () => {
  let service: TodoAuthorizationService;
  let todoRepository: jest.Mocked<TodoRepository>;

  beforeEach(() => {
    todoRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TodoRepository>;
    service = new TodoAuthorizationService(todoRepository);
  });

  describe('validateOwnership', () => {
    it('should return the todo when it exists and user is the owner', async () => {
      const mockTodo = { id: 'todo-1', userId: 'user-1', content: 'Test' };
      todoRepository.findById.mockResolvedValue(mockTodo as never);

      const result = await service.validateOwnership('todo-1', 'user-1');

      expect(result).toBe(mockTodo);
      expect(todoRepository.findById).toHaveBeenCalledWith('todo-1');
    });

    it('should throw NotFoundException when todo does not exist', async () => {
      todoRepository.findById.mockResolvedValue(null);

      await expect(
        service.validateOwnership('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.validateOwnership('nonexistent', 'user-1'),
      ).rejects.toThrow(ERROR_CODES.TODO_NOT_FOUND);
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const mockTodo = { id: 'todo-1', userId: 'user-1', content: 'Test' };
      todoRepository.findById.mockResolvedValue(mockTodo as never);

      await expect(
        service.validateOwnership('todo-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.validateOwnership('todo-1', 'other-user'),
      ).rejects.toThrow(ERROR_CODES.FORBIDDEN);
    });
  });
});
