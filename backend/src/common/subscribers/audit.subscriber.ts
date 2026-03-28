import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { RequestContext } from '../context/request-context';
import { BaseEntity } from '../entities/base.entity';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<BaseEntity> {
  beforeInsert(event: InsertEvent<BaseEntity>): void {
    if (!event.entity) return;

    const userId = RequestContext.getCurrentUserId();
    if (!event.entity.createdBy) {
      event.entity.createdBy = userId;
    }
    if (!event.entity.updatedBy) {
      event.entity.updatedBy = userId;
    }
  }

  beforeUpdate(event: UpdateEvent<BaseEntity>): void {
    if (!event.entity) return;

    const userId = RequestContext.getCurrentUserId();
    (event.entity as BaseEntity).updatedBy = userId;
  }
}
