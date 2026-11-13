import { Body, Controller, Get, Post } from '@nestjs/common';
import type { DataResponse } from '@nba/dtos';
import {
  type CreateGroupRequest,
  createGroupRequestSchema,
  type GroupDto,
} from '@nba/dtos-groups';
import { CurrentUser } from '@nba/frontend-api-auth';
import { YupPipe } from '@nba/frontend-api-common';
import type { UserEntity } from '@nba/sql-users';
import { GroupsService } from './groups.service';

// Groups of users: the ones the caller may see, and making one.
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  async find(
    @CurrentUser() user: UserEntity,
  ): Promise<DataResponse<GroupDto[]>> {
    return { data: await this.groups.findVisibleTo(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: UserEntity,
    @Body(new YupPipe(createGroupRequestSchema)) request: CreateGroupRequest,
  ): Promise<DataResponse<GroupDto>> {
    return { data: await this.groups.create(user, request) };
  }
}
