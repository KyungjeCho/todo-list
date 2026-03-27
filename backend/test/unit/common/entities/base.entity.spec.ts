import { BaseEntity } from 'src/common/entities/base.entity';

describe('BaseEntity', () => {
  let entity: BaseEntity;

  beforeEach(() => {
    entity = new BaseEntity();
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });

  it('should have id property', () => {
    const testId = '550e8400-e29b-41d4-a716-446655440000';
    entity.id = testId;
    expect(entity.id).toBe(testId);
  });

  it('should have createdAt property', () => {
    const now = new Date();
    entity.createdAt = now;
    expect(entity.createdAt).toBe(now);
  });

  it('should have createdBy property', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    entity.createdBy = userId;
    expect(entity.createdBy).toBe(userId);
  });

  it('should have updatedAt property', () => {
    const now = new Date();
    entity.updatedAt = now;
    expect(entity.updatedAt).toBe(now);
  });

  it('should have updatedBy property', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    entity.updatedBy = userId;
    expect(entity.updatedBy).toBe(userId);
  });

  it('should have nullable deletedAt property', () => {
    expect(entity.deletedAt).toBeUndefined();

    const now = new Date();
    entity.deletedAt = now;
    expect(entity.deletedAt).toBe(now);
  });

  it('should allow deletedAt to be null for soft delete', () => {
    entity.deletedAt = null;
    expect(entity.deletedAt).toBeNull();
  });

  it('should set all audit fields correctly', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const now = new Date();

    entity.id = id;
    entity.createdAt = now;
    entity.createdBy = userId;
    entity.updatedAt = now;
    entity.updatedBy = userId;
    entity.deletedAt = null;

    expect(entity.id).toBe(id);
    expect(entity.createdAt).toBe(now);
    expect(entity.createdBy).toBe(userId);
    expect(entity.updatedAt).toBe(now);
    expect(entity.updatedBy).toBe(userId);
    expect(entity.deletedAt).toBeNull();
  });
});
