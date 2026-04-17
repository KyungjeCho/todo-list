import { TodoItemMapper } from '../../../../../src/todo/application/mappers/todo-item.mapper';
import { TodoStatus } from '../../../../../src/todo/domain/todo.entity';

describe('TodoItemMapper', () => {
  describe('toDto', () => {
    it('should map a todo with memos to TodoItemDto', () => {
      const todo = {
        id: 'todo-1',
        content: 'Test todo',
        status: TodoStatus.ACTIVE,
        todoDate: '2026-04-17',
        memos: [
          {
            id: 'memo-1',
            todoId: 'todo-1',
            content: 'Memo content',
            createdAt: new Date('2026-04-17T10:00:00Z'),
            updatedAt: new Date('2026-04-17T10:00:00Z'),
          },
        ],
        createdAt: new Date('2026-04-17T09:00:00Z'),
        updatedAt: new Date('2026-04-17T09:00:00Z'),
      };

      const result = TodoItemMapper.toDto(todo as never);

      expect(result).toEqual({
        id: 'todo-1',
        content: 'Test todo',
        status: TodoStatus.ACTIVE,
        isCarriedOver: false,
        todoDate: '2026-04-17',
        memos: [
          {
            id: 'memo-1',
            todoId: 'todo-1',
            content: 'Memo content',
            createdAt: '2026-04-17T10:00:00.000Z',
            updatedAt: '2026-04-17T10:00:00.000Z',
          },
        ],
        createdAt: '2026-04-17T09:00:00.000Z',
        updatedAt: '2026-04-17T09:00:00.000Z',
      });
    });

    it('should handle empty memos array', () => {
      const todo = {
        id: 'todo-2',
        content: 'No memos',
        status: TodoStatus.COMPLETED,
        todoDate: '2026-04-17',
        memos: [],
        createdAt: new Date('2026-04-17T09:00:00Z'),
        updatedAt: new Date('2026-04-17T09:00:00Z'),
      };

      const result = TodoItemMapper.toDto(todo as never);

      expect(result.memos).toEqual([]);
    });

    it('should handle null/undefined memos', () => {
      const todo = {
        id: 'todo-3',
        content: 'Null memos',
        status: TodoStatus.ACTIVE,
        todoDate: '2026-04-17',
        memos: null,
        createdAt: new Date('2026-04-17T09:00:00Z'),
        updatedAt: new Date('2026-04-17T09:00:00Z'),
      };

      const result = TodoItemMapper.toDto(todo as never);

      expect(result.memos).toEqual([]);
    });

    it('should set isCarriedOver to true for CARRIED_OVER status', () => {
      const todo = {
        id: 'todo-4',
        content: 'Carried over',
        status: TodoStatus.CARRIED_OVER,
        todoDate: '2026-04-17',
        memos: [],
        createdAt: new Date('2026-04-17T09:00:00Z'),
        updatedAt: new Date('2026-04-17T09:00:00Z'),
      };

      const result = TodoItemMapper.toDto(todo as never);

      expect(result.isCarriedOver).toBe(true);
    });

    it('should convert dates to ISO strings', () => {
      const todo = {
        id: 'todo-5',
        content: 'Date test',
        status: TodoStatus.ACTIVE,
        todoDate: '2026-04-17',
        memos: [],
        createdAt: new Date('2026-01-15T08:30:00Z'),
        updatedAt: new Date('2026-02-20T14:45:00Z'),
      };

      const result = TodoItemMapper.toDto(todo as never);

      expect(result.createdAt).toBe('2026-01-15T08:30:00.000Z');
      expect(result.updatedAt).toBe('2026-02-20T14:45:00.000Z');
    });
  });
});
