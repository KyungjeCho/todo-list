import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appController: AppController;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: DataSource, useValue: mockDataSource }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return ok when DB is connected', async () => {
      const result = await appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });

    it('should return error when DB is disconnected', async () => {
      (mockDataSource.query as jest.Mock).mockRejectedValue(
        new Error('connection refused'),
      );
      const result = await appController.getHealth();
      expect(result.status).toBe('error');
      expect(result.database).toBe('disconnected');
    });
  });
});
