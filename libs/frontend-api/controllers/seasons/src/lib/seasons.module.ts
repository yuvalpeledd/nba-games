import { Module } from '@nestjs/common';
import { SeasonModule } from '@nba/sql-seasons';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [SeasonModule],
  controllers: [SeasonsController],
  providers: [SeasonsService],
})
export class FrontendApiSeasonsControllerModule {}
