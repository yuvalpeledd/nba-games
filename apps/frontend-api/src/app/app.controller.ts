import { Controller, Get } from '@nestjs/common';
import { DataResponse } from '@nba/dtos';
import { Public } from '@nba/frontend-api-auth';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly db: DataSource) {}

  // Fails (500) when the DB is unreachable. Public: the platform probes it.
  @Get('health')
  @Public()
  async health(): Promise<DataResponse<{ status: 'ok' }>> {
    await this.db.query('SELECT 1');
    return { data: { status: 'ok' } };
  }
}
