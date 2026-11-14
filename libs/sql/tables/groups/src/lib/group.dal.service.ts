import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { GroupStatus } from '../enums';
import { GroupEntity } from './group.entity';
import { GroupRepo } from './group.repo';

// Making a group adds its owner as a member too, so it's GroupMemberDalService's (createGroup), as are the lists.
@Injectable()
export class GroupDalService {
  constructor(private readonly repo: GroupRepo) {}

  findById(id: string): Promise<GroupEntity | null> {
    return this.repo.findOneBy({ id });
  }

  // These groups (a deleted one isn't among them), by id.
  async findByIds(ids: string[]): Promise<Map<string, GroupEntity>> {
    const groups = ids.length ? await this.repo.findBy({ id: In(ids) }) : [];
    return new Map(groups.map((group) => [group.id, group]));
  }

  async update(
    id: string,
    changes: Partial<
      Pick<
        GroupEntity,
        | 'name'
        | 'public'
        | 'defaultScore'
        | 'maxMembers'
        | 'startDate'
        | 'endDate'
      >
    >,
  ): Promise<void> {
    await this.repo.update({ id }, changes);
  }

  // Soft: the row stays, Deleted, and no read finds it again.
  async delete(id: string): Promise<void> {
    await this.repo.update(
      { id },
      { status: GroupStatus.DELETED, deletedAt: new Date() },
    );
  }
}
