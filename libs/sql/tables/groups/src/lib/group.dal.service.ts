import { Injectable } from '@nestjs/common';
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

  async update(
    id: string,
    changes: Pick<GroupEntity, 'name' | 'public'>,
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
