import { Module } from '@nestjs/common';
import { GroupMemberModule } from '@nba/sql-group-members';
import { GroupModule } from '@nba/sql-groups';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [GroupModule, GroupMemberModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class FrontendApiGroupsControllerModule {}
