import { Module } from '@nestjs/common';
import { GroupMemberModule } from '@nba/sql-group-members';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [GroupMemberModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class FrontendApiGroupsControllerModule {}
