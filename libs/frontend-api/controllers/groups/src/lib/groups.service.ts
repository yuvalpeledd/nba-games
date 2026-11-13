import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateGroupRequest,
  GroupDetailsDto,
  GroupDto,
  GroupMemberPredictionDto,
} from '@nba/dtos-groups';
import { isPredictionLocked } from '@nba/dtos-predictions';
import { GameDalService } from '@nba/sql-games';
import {
  GroupMemberDalService,
  type GroupWithMembers,
} from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-score';
import { PredictionDalService } from '@nba/sql-predictions';
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
  constructor(
    private readonly members: GroupMemberDalService,
    private readonly scores: GroupUserScoreDalService,
    private readonly games: GameDalService,
    private readonly predictions: PredictionDalService,
  ) {}

  async findVisibleTo(userId: string): Promise<GroupDto[]> {
    const groups = await this.members.findVisibleTo(userId);
    return groups.map(toGroupDto);
  }

  async findOne(id: string, userId: string): Promise<GroupDetailsDto> {
    const group = await this.visibleGroup(id, userId);
    const [members, totals] = await Promise.all([
      this.members.findMembers(id),
      this.scores.totalsByGroup(id),
    ]);
    return {
      ...toGroupDto(group),
      members: members.map((member) => ({
        id: member.userId,
        name: member.user?.name ?? '',
        score: totals.get(member.userId) ?? 0,
      })),
    };
  }

  // Each member's pick of the game, by name; which pick only once the game locks. 404 for an unknown game too.
  async findPredictions(
    id: string,
    gameId: string,
    userId: string,
  ): Promise<GroupMemberPredictionDto[]> {
    await this.visibleGroup(id, userId);
    const game = await this.games.findById(gameId);
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    const [members, predictions] = await Promise.all([
      this.members.findMembers(id),
      this.predictions.findByGame(gameId),
    ]);
    const picks = new Map(predictions.map((p) => [p.userId, p.pick]));
    const locked = isPredictionLocked(game);
    return members.map((member) => {
      const pick = picks.get(member.userId) ?? null;
      return {
        id: member.userId,
        name: member.user?.name ?? '',
        picked: pick !== null,
        pick: locked ? pick : null,
      };
    });
  }

  // A private group the caller isn't in is a 404 too, so its id gives nothing away.
  private async visibleGroup(
    id: string,
    userId: string,
  ): Promise<GroupWithMembers> {
    const group = await this.members.findVisibleById(id, userId);
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
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
