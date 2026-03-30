import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLog } from '../domain/notification-log.entity';

@Injectable()
export class NotificationLogRepository {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
  ) {}

  create(data: Partial<NotificationLog>): NotificationLog {
    return this.logRepo.create(data);
  }

  async save(entity: NotificationLog): Promise<NotificationLog> {
    return this.logRepo.save(entity);
  }
}
