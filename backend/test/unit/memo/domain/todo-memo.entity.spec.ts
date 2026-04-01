import { TodoMemo } from 'src/memo/domain/todo-memo.entity';

describe('TodoMemo Entity', () => {
  let entity: TodoMemo;

  beforeEach(() => {
    entity = new TodoMemo();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property (UUID PK)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = id;
    expect(entity.id).toBe(id);
  });

  it('should have todoId property (FK)', () => {
    const todoId = '550e8400-e29b-41d4-a716-446655440001';
    entity.todoId = todoId;
    expect(entity.todoId).toBe(todoId);
  });

  it('should have content property (TEXT)', () => {
    entity.content = '메모 내용입니다';
    expect(entity.content).toBe('메모 내용입니다');
  });

  it('should allow long content (TEXT type, no length limit)', () => {
    const longContent = '메모'.repeat(1000);
    entity.content = longContent;
    expect(entity.content).toBe(longContent);
  });

  it('should inherit audit fields from BaseEntity', () => {
    const now = new Date();
    const userId = '550e8400-e29b-41d4-a716-446655440002';

    entity.createdAt = now;
    entity.createdBy = userId;
    entity.updatedAt = now;
    entity.updatedBy = userId;
    entity.deletedAt = null;

    expect(entity.createdAt).toBe(now);
    expect(entity.createdBy).toBe(userId);
    expect(entity.updatedAt).toBe(now);
    expect(entity.updatedBy).toBe(userId);
    expect(entity.deletedAt).toBeNull();
  });

  it('should support soft delete via deletedAt', () => {
    const deletedAt = new Date('2026-03-31T12:00:00Z');
    entity.deletedAt = deletedAt;
    expect(entity.deletedAt).toBe(deletedAt);
  });

  it('should have todo relation (many-to-one)', () => {
    expect(entity).toHaveProperty('todo');
  });
});
