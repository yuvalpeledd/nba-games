import { Injectable } from '@nestjs/common';
import { type GroupCreateObject, GroupEntity } from '@nba/sql-groups';
import { GroupMemberEntity } from './group-member.entity';
import { GroupMemberRepo } from './group-member.repo';

// A group, with its owner (loaded), how many members it has, and whether the user asking is one.
export interface GroupWithMembers {
  group: GroupEntity;
  memberCount: number;
  isMember: boolean;
}

const IS_MEMBER =
  'EXISTS (SELECT 1 FROM group_members mine WHERE mine.group_id = g.id AND mine.user_id = :userId)';

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
  findVisibleTo(userId: string): Promise<GroupWithMembers[]> {
    return this.visibleTo(userId);
  }

  // One group, if the user may see it (public, or they're in it), else null.
  async findVisibleById(
    id: string,
    userId: string,
  ): Promise<GroupWithMembers | null> {
    const [group] = await this.visibleTo(userId, id);
    return group ?? null;
  }

  // A group's members, with their users, by name.
  findMembers(groupId: string): Promise<GroupMemberEntity[]> {
    return this.repo.find({
      where: { groupId },
      relations: { user: true },
      order: { user: { name: 'ASC' }, userId: 'ASC' },
    });
  }

  private async visibleTo(
    userId: string,
    id?: string,
  ): Promise<GroupWithMembers[]> {
    const query = this.repo.manager
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
      .addSelect(IS_MEMBER, 'is_member')
      .where(`(g.public OR ${IS_MEMBER})`, { userId });
    if (id) query.andWhere('g.id = :id', { id });
    const { entities, raw } = await query
      .orderBy('g.name')
      .addOrderBy('g.id')
      .getRawAndEntities<{
        g_id: string;
        member_count: string;
        is_member: boolean;
      }>();
    const rows = new Map(raw.map((row) => [row.g_id, row]));
    return entities.map((group) => ({
      group,
      memberCount: Number(rows.get(group.id)?.member_count ?? 0),
      isMember: rows.get(group.id)?.is_member ?? false,
    }));
  }
}
