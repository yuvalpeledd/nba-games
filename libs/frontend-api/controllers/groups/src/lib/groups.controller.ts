import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { DataResponse } from '@nba/dtos';
import {
  type CreateGroupRequest,
  createGroupRequestSchema,
  type GroupDetailsDto,
  type GroupDto,
  groupIdSchema,
  type UpdateGroupRequest,
  updateGroupRequestSchema,
} from '@nba/dtos-groups';
import { CurrentUser } from '@nba/frontend-api-auth';
import { YupPipe } from '@nba/frontend-api-common';
import type { UserEntity } from '@nba/sql-users';
import { GroupsService } from './groups.service';

// Groups of users: the ones the caller may see, one with its members, making one, and its owner's edit and delete.
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  async find(
    @CurrentUser() user: UserEntity,
  ): Promise<DataResponse<GroupDto[]>> {
    return { data: await this.groups.findVisibleTo(user.id) };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: UserEntity,
    @Param('id', new YupPipe(groupIdSchema)) id: string,
  ): Promise<DataResponse<GroupDetailsDto>> {
    return { data: await this.groups.findOne(id, user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: UserEntity,
    @Body(new YupPipe(createGroupRequestSchema)) request: CreateGroupRequest,
  ): Promise<DataResponse<GroupDto>> {
    return { data: await this.groups.create(user, request) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id', new YupPipe(groupIdSchema)) id: string,
    @Body(new YupPipe(updateGroupRequestSchema)) request: UpdateGroupRequest,
  ): Promise<DataResponse<GroupDto>> {
    return { data: await this.groups.update(id, user.id, request) };
  }

  @Delete(':id')
  @HttpCode(204)
  delete(
    @CurrentUser() user: UserEntity,
    @Param('id', new YupPipe(groupIdSchema)) id: string,
  ): Promise<void> {
    return this.groups.delete(id, user.id);
  }
}
