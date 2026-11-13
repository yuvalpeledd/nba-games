import { Controller, Get } from '@nestjs/common';
import { DataResponse } from '@nba/dtos';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly db: DataSource) {}

  // Fails (500) when the DB is unreachable.
  @Get('health')
  async health(): Promise<DataResponse<{ status: 'ok' }>> {
    await this.db.query('SELECT 1');
    return { data: { status: 'ok' } };
  }
}
