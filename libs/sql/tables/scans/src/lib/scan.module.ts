import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScanDalService } from './scan.dal.service';
import { ScanEntity } from './scan.entity';
import { ScanRepo } from './scan.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([ScanEntity])],
  providers: [ScanRepo, ScanDalService],
  exports: [ScanDalService],
})
export class ScanModule {}
