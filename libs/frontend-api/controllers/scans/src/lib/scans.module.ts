import { Module } from '@nestjs/common';
import { ScanModule } from '@nba/sql-scans';
import { ScansController } from './scans.controller';

@Module({
  imports: [ScanModule],
  controllers: [ScansController],
})
export class FrontendApiScansControllerModule {}
