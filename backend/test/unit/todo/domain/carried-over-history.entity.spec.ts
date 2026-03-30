import { CarriedOverHistory } from 'src/todo/domain/carried-over-history.entity';

describe('CarriedOverHistory Entity', () => {
  let entity: CarriedOverHistory;

  beforeEach(() => {
    entity = new CarriedOverHistory();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property (UUID PK)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = id;
    expect(entity.id).toBe(id);
  });

  it('should have fromTodoId property (FK to original todo)', () => {
    const fromTodoId = '550e8400-e29b-41d4-a716-446655440001';
    entity.fromTodoId = fromTodoId;
    expect(entity.fromTodoId).toBe(fromTodoId);
  });

  it('should have toTodoId property (FK to carried-over todo)', () => {
    const toTodoId = '550e8400-e29b-41d4-a716-446655440002';
    entity.toTodoId = toTodoId;
    expect(entity.toTodoId).toBe(toTodoId);
  });

  it('should inherit audit fields from BaseEntity', () => {
    const now = new Date();
    const userId = '550e8400-e29b-41d4-a716-446655440003';

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

  it('should have fromTodo relation', () => {
    expect(entity).toHaveProperty('fromTodo');
  });

  it('should have toTodo relation', () => {
    expect(entity).toHaveProperty('toTodo');
  });

  it('should track carry-over relationship between two todos', () => {
    const fromId = '550e8400-e29b-41d4-a716-446655440001';
    const toId = '550e8400-e29b-41d4-a716-446655440002';

    entity.fromTodoId = fromId;
    entity.toTodoId = toId;

    expect(entity.fromTodoId).not.toBe(entity.toTodoId);
    expect(entity.fromTodoId).toBe(fromId);
    expect(entity.toTodoId).toBe(toId);
  });
});
