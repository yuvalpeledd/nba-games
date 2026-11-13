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
import { type DataResponse, idSchema } from '@nba/dtos';
import {
  type CreateGroupRequest,
  createGroupRequestSchema,
  type GroupDetailsDto,
  type GroupDto,
  groupIdSchema,
  type GroupMemberPredictionDto,
  type UpdateGroupRequest,
  updateGroupRequestSchema,
} from '@nba/dtos-groups';
import { CurrentUser } from '@nba/frontend-api-auth';
import { YupPipe } from '@nba/frontend-api-common';
import type { UserEntity } from '@nba/sql-users';
import { GroupsService } from './groups.service';

// Groups of users: the ones the caller may see, one with its members' scores, their picks of a game (members only),
// making one, joining and leaving one, and its owner's edit and delete.
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

  @Get(':id/games/:gameId/predictions')
  async findPredictions(
    @CurrentUser() user: UserEntity,
    @Param('id', new YupPipe(groupIdSchema)) id: string,
    @Param('gameId', new YupPipe(idSchema.required())) gameId: string,
  ): Promise<DataResponse<GroupMemberPredictionDto[]>> {
    return { data: await this.groups.findPredictions(id, gameId, user.id) };
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

  @Post(':id/members')
  async join(
    @CurrentUser() user: UserEntity,
    @Param('id', new YupPipe(groupIdSchema)) id: string,
  ): Promise<DataResponse<GroupDto>> {
    return { data: await this.groups.join(id, user.id) };
  }

  @Delete(':id/members/me')
  @HttpCode(204)
  leave(
    @CurrentUser() user: UserEntity,
    @Param('id', new YupPipe(groupIdSchema)) id: string,
  ): Promise<void> {
    return this.groups.leave(id, user.id);
  }
}
