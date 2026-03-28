import { AuditSubscriber } from 'src/common/subscribers/audit.subscriber';
import {
  RequestContext,
  SYSTEM_USER_ID,
} from 'src/common/context/request-context';
import type { InsertEvent, UpdateEvent } from 'typeorm';
import type { BaseEntity } from 'src/common/entities/base.entity';

describe('AuditSubscriber', () => {
  let subscriber: AuditSubscriber;

  beforeEach(() => {
    subscriber = new AuditSubscriber();
  });

  describe('beforeInsert', () => {
    it('should set createdBy and updatedBy from RequestContext', (done) => {
      const userId = 'test-user-id';
      const entity = {} as BaseEntity;

      RequestContext.run({ currentUserId: userId }, () => {
        subscriber.beforeInsert({ entity } as InsertEvent<BaseEntity>);
        expect(entity.createdBy).toBe(userId);
        expect(entity.updatedBy).toBe(userId);
        done();
      });
    });

    it('should use SYSTEM_USER_ID when no context is set', () => {
      const entity = {} as BaseEntity;

      subscriber.beforeInsert({ entity } as InsertEvent<BaseEntity>);

      expect(entity.createdBy).toBe(SYSTEM_USER_ID);
      expect(entity.updatedBy).toBe(SYSTEM_USER_ID);
    });

    it('should not overwrite createdBy if already set', (done) => {
      const entity = { createdBy: 'original-user' } as BaseEntity;

      RequestContext.run({ currentUserId: 'other-user' }, () => {
        subscriber.beforeInsert({ entity } as InsertEvent<BaseEntity>);
        expect(entity.createdBy).toBe('original-user');
        expect(entity.updatedBy).toBe('other-user');
        done();
      });
    });

    it('should do nothing when entity is undefined', () => {
      expect(() => {
        subscriber.beforeInsert({
          entity: undefined,
        } as InsertEvent<BaseEntity>);
      }).not.toThrow();
    });
  });

  describe('beforeUpdate', () => {
    it('should set updatedBy from RequestContext', (done) => {
      const userId = 'test-user-id';
      const entity = { updatedBy: 'old-user' } as BaseEntity;

      RequestContext.run({ currentUserId: userId }, () => {
        subscriber.beforeUpdate({ entity } as UpdateEvent<BaseEntity>);
        expect(entity.updatedBy).toBe(userId);
        done();
      });
    });

    it('should do nothing when entity is undefined', () => {
      expect(() => {
        subscriber.beforeUpdate({
          entity: undefined,
        } as unknown as UpdateEvent<BaseEntity>);
      }).not.toThrow();
    });
  });
});
