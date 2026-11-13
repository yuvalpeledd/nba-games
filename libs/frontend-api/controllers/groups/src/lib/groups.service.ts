import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateGroupRequest,
  GroupDetailsDto,
  GroupDto,
} from '@nba/dtos-groups';
import {
  GroupMemberDalService,
  type GroupWithMembers,
} from '@nba/sql-group-members';
import type { UserEntity } from '@nba/sql-users';

const toGroupDto = ({
  group,
  memberCount,
  isMember,
}: GroupWithMembers): GroupDto => ({
  id: group.id,
  name: group.name,
  public: group.public,
  status: group.status,
  owner: { id: group.ownerId, name: group.owner?.name ?? '' },
  memberCount,
  isMember,
});

@Injectable()
export class GroupsService {
  constructor(private readonly members: GroupMemberDalService) {}

  async findVisibleTo(userId: string): Promise<GroupDto[]> {
    const groups = await this.members.findVisibleTo(userId);
    return groups.map(toGroupDto);
  }

  // A private group the caller isn't in is a 404 too, so its id gives nothing away.
  async findOne(id: string, userId: string): Promise<GroupDetailsDto> {
    const group = await this.members.findVisibleById(id, userId);
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    const members = await this.members.findMembers(id);
    return {
      ...toGroupDto(group),
      members: members.map((member) => ({
        id: member.userId,
        name: member.user?.name ?? '',
      })),
    };
  }

  // The caller owns it and is its only member.
  async create(
    owner: UserEntity,
    request: CreateGroupRequest,
  ): Promise<GroupDto> {
    const group = await this.members.createGroup({
      ...request,
      ownerId: owner.id,
    });
    return toGroupDto({
      group: { ...group, owner },
      memberCount: 1,
      isMember: true,
    });
  }
}
