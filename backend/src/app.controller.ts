import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface HealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
}

@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  /** GET /health — 서비스 상태 및 DB 연결 확인 */
  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
