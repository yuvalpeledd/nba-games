import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupDalService } from './group.dal.service';
import { GroupEntity } from './group.entity';
import { GroupRepo } from './group.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([GroupEntity])],
  providers: [GroupRepo, GroupDalService],
  exports: [GroupDalService],
})
export class GroupModule {}
