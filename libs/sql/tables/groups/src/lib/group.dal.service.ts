import { Injectable } from '@nestjs/common';
import { GroupEntity } from './group.entity';
import { GroupRepo } from './group.repo';

// Making a group adds its owner as a member too, so it's GroupMemberDalService's (createGroup), as are the lists.
@Injectable()
export class GroupDalService {
  constructor(private readonly repo: GroupRepo) {}

  findById(id: string): Promise<GroupEntity | null> {
    return this.repo.findOneBy({ id });
  }
}
