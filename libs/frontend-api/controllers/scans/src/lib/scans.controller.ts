import { Controller, Get } from '@nestjs/common';
import { DataResponse } from '@nba/dtos';
import { ScanDto } from '@nba/dtos-scans';
import { ScanDalService, type ScanEntity } from '@nba/sql-scans';

export const toScanDto = (scan: ScanEntity): ScanDto => ({
  startedAt: scan.startedAt.toISOString(),
  finishedAt: scan.finishedAt.toISOString(),
  success: scan.success,
  inserted: scan.inserted,
  updated: scan.updated,
  unchanged: scan.unchanged,
  error: scan.error,
});

// ponytail: no service, the DAL read is the whole of it; add one when this does more.
@Controller('scans')
export class ScansController {
  constructor(private readonly scans: ScanDalService) {}

  // The latest data-fetcher run; null before the first.
  @Get('last')
  async findLast(): Promise<DataResponse<ScanDto | null>> {
    const scan = await this.scans.findLast();
    return { data: scan && toScanDto(scan) };
  }
}
