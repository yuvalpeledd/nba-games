import { Injectable } from '@nestjs/common';
import { type GroupCreateObject, GroupEntity } from '@nba/sql-groups';
import { GroupMemberEntity } from './group-member.entity';
import { GroupMemberRepo } from './group-member.repo';

// A group, with its owner (loaded) and how many members it has.
export interface GroupWithMembers {
  group: GroupEntity;
  memberCount: number;
}

// Groups' members, and the groups themselves where members come with them (a group is made with its owner in it).
@Injectable()
export class GroupMemberDalService {
  constructor(private readonly repo: GroupMemberRepo) {}

  // The group, Active, with its owner as its first member.
  createGroup(group: GroupCreateObject): Promise<GroupEntity> {
    return this.repo.manager.transaction(async (manager) => {
      const created = await manager.save(
        GroupEntity,
        manager.create(GroupEntity, group),
      );
      await manager.insert(GroupMemberEntity, {
        groupId: created.id,
        userId: group.ownerId,
      });
      return created;
    });
  }

  // The groups a user may see: every public one and the private ones they're in, by name.
  // ponytail: every one, unpaged; page it when groups can outgrow a screen.
  async findVisibleTo(userId: string): Promise<GroupWithMembers[]> {
    const { entities, raw } = await this.repo.manager
      .createQueryBuilder(GroupEntity, 'g')
      .innerJoinAndSelect('g.owner', 'owner')
      .addSelect(
        (members) =>
          members
            .select('COUNT(*)')
            .from(GroupMemberEntity, 'm')
            .where('m.group_id = g.id'),
        'member_count',
      )
      .where(
        'g.public OR EXISTS (SELECT 1 FROM group_members mine WHERE mine.group_id = g.id AND mine.user_id = :userId)',
        { userId },
      )
      .orderBy('g.name')
      .addOrderBy('g.id')
      .getRawAndEntities<{ g_id: string; member_count: string }>();
    const counts = new Map(
      raw.map((row) => [row.g_id, Number(row.member_count)]),
    );
    return entities.map((group) => ({
      group,
      memberCount: counts.get(group.id) ?? 0,
    }));
  }
}
