import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMemberDalService } from './group-member.dal.service';
import { GroupMemberEntity } from './group-member.entity';
import { GroupMemberRepo } from './group-member.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([GroupMemberEntity])],
  providers: [GroupMemberRepo, GroupMemberDalService],
  exports: [GroupMemberDalService],
})
export class GroupMemberModule {}
