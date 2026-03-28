import { Todo, TodoStatus } from 'src/todo/domain/todo.entity';

describe('Todo Entity', () => {
  let entity: Todo;

  beforeEach(() => {
    entity = new Todo();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property (UUID PK)', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = id;
    expect(entity.id).toBe(id);
  });

  it('should have userId property (FK)', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    entity.userId = userId;
    expect(entity.userId).toBe(userId);
  });

  it('should have todoDate property (DATE)', () => {
    entity.todoDate = '2026-03-28';
    expect(entity.todoDate).toBe('2026-03-28');
  });

  it('should have content property (VARCHAR 255)', () => {
    entity.content = '장보기';
    expect(entity.content).toBe('장보기');
  });

  it('should have status property with TodoStatus enum', () => {
    entity.status = TodoStatus.ACTIVE;
    expect(entity.status).toBe('ACTIVE');
  });

  it('should support all TodoStatus values', () => {
    expect(TodoStatus.ACTIVE).toBe('ACTIVE');
    expect(TodoStatus.INACTIVE).toBe('INACTIVE');
    expect(TodoStatus.COMPLETED).toBe('COMPLETED');
    expect(TodoStatus.CARRIED_OVER).toBe('CARRIED_OVER');
  });

  it('should inherit audit fields from BaseEntity', () => {
    const now = new Date();
    const userId = '550e8400-e29b-41d4-a716-446655440001';

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

  it('should have user relation (many-to-one)', () => {
    expect(entity).toHaveProperty('user');
  });

  it('should have memos relation (one-to-many)', () => {
    expect(entity).toHaveProperty('memos');
  });

  describe('Status Transitions', () => {
    describe('ACTIVE transitions', () => {
      beforeEach(() => {
        entity.status = TodoStatus.ACTIVE;
      });

      it('should allow ACTIVE -> COMPLETED', () => {
        expect(entity.canTransitionTo(TodoStatus.COMPLETED)).toBe(true);
      });

      it('should allow ACTIVE -> INACTIVE', () => {
        expect(entity.canTransitionTo(TodoStatus.INACTIVE)).toBe(true);
      });

      it('should not allow ACTIVE -> ACTIVE (same status)', () => {
        expect(entity.canTransitionTo(TodoStatus.ACTIVE)).toBe(false);
      });

      it('should not allow ACTIVE -> CARRIED_OVER by user', () => {
        expect(entity.canTransitionTo(TodoStatus.CARRIED_OVER)).toBe(false);
      });
    });

    describe('INACTIVE transitions', () => {
      beforeEach(() => {
        entity.status = TodoStatus.INACTIVE;
      });

      it('should allow INACTIVE -> ACTIVE (reactivation)', () => {
        expect(entity.canTransitionTo(TodoStatus.ACTIVE)).toBe(true);
      });

      it('should not allow INACTIVE -> COMPLETED', () => {
        expect(entity.canTransitionTo(TodoStatus.COMPLETED)).toBe(false);
      });

      it('should not allow INACTIVE -> CARRIED_OVER', () => {
        expect(entity.canTransitionTo(TodoStatus.CARRIED_OVER)).toBe(false);
      });
    });

    describe('COMPLETED transitions', () => {
      beforeEach(() => {
        entity.status = TodoStatus.COMPLETED;
      });

      it('should allow COMPLETED -> ACTIVE (undo completion)', () => {
        expect(entity.canTransitionTo(TodoStatus.ACTIVE)).toBe(true);
      });

      it('should not allow COMPLETED -> INACTIVE', () => {
        expect(entity.canTransitionTo(TodoStatus.INACTIVE)).toBe(false);
      });

      it('should not allow COMPLETED -> CARRIED_OVER', () => {
        expect(entity.canTransitionTo(TodoStatus.CARRIED_OVER)).toBe(false);
      });
    });

    describe('CARRIED_OVER transitions', () => {
      beforeEach(() => {
        entity.status = TodoStatus.CARRIED_OVER;
      });

      it('should not allow CARRIED_OVER -> any status (terminal state)', () => {
        expect(entity.canTransitionTo(TodoStatus.ACTIVE)).toBe(false);
        expect(entity.canTransitionTo(TodoStatus.INACTIVE)).toBe(false);
        expect(entity.canTransitionTo(TodoStatus.COMPLETED)).toBe(false);
      });
    });

    describe('changeStatus', () => {
      it('should change status for valid transition', () => {
        entity.status = TodoStatus.ACTIVE;
        entity.changeStatus(TodoStatus.COMPLETED);
        expect(entity.status).toBe(TodoStatus.COMPLETED);
      });

      it('should throw error for invalid transition', () => {
        entity.status = TodoStatus.CARRIED_OVER;
        expect(() => entity.changeStatus(TodoStatus.ACTIVE)).toThrow();
      });

      it('should throw error with descriptive message', () => {
        entity.status = TodoStatus.INACTIVE;
        expect(() => entity.changeStatus(TodoStatus.COMPLETED)).toThrow(
          /INACTIVE.*COMPLETED/,
        );
      });
    });
  });
});
