import { Injectable } from '@nestjs/common';
import type { CreateGroupRequest, GroupDto } from '@nba/dtos-groups';
import {
  GroupMemberDalService,
  type GroupWithMembers,
} from '@nba/sql-group-members';
import type { UserEntity } from '@nba/sql-users';

const toGroupDto = ({ group, memberCount }: GroupWithMembers): GroupDto => ({
  id: group.id,
  name: group.name,
  public: group.public,
  status: group.status,
  owner: { id: group.ownerId, name: group.owner?.name ?? '' },
  memberCount,
});

@Injectable()
export class GroupsService {
  constructor(private readonly members: GroupMemberDalService) {}

  async findVisibleTo(userId: string): Promise<GroupDto[]> {
    const groups = await this.members.findVisibleTo(userId);
    return groups.map(toGroupDto);
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
    return toGroupDto({ group: { ...group, owner }, memberCount: 1 });
  }
}
