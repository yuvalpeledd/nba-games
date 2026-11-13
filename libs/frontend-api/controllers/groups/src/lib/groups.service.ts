import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type CreateGroupRequest,
  type GroupDetailsDto,
  type GroupDto,
  type GroupGameScoreDto,
  type GroupMemberPredictionDto,
  isGameCompleted,
  type UpdateGroupRequest,
} from '@nba/dtos-groups';
import { isPredictionLocked } from '@nba/dtos-predictions';
import { ErrorCode } from '@nba/enums';
import { GameDalService } from '@nba/sql-games';
import { GroupGameScoreDalService } from '@nba/sql-group-game-score';
import {
  GroupMemberDalService,
  type GroupWithMembers,
} from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-score';
import { PredictionDalService } from '@nba/sql-predictions';
import { GroupDalService } from '@nba/sql-groups';
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
    private readonly groups: GroupDalService,
    private readonly members: GroupMemberDalService,
    private readonly scores: GroupUserScoreDalService,
    private readonly games: GameDalService,
    private readonly predictions: PredictionDalService,
    private readonly gameScores: GroupGameScoreDalService,
  ) {}

  async findVisibleTo(userId: string): Promise<GroupDto[]> {
    const groups = await this.members.findVisibleTo(userId);
    return groups.map(toGroupDto);
  }

  async findOne(id: string, userId: string): Promise<GroupDetailsDto> {
    const group = await this.visible(id, userId);
    const [members, totals, gameScores] = await Promise.all([
      this.members.findMembers(id),
      this.scores.totalsByGroup(id),
      this.gameScores.findByGroup(id),
    ]);
    return {
      ...toGroupDto(group),
      members: members.map((member) => ({
        id: member.userId,
        name: member.user?.name ?? '',
        score: totals.get(member.userId) ?? 0,
      })),
      gameScores: gameScores.map(({ gameId, score }) => ({ gameId, score })),
    };
  }

  // Each member's pick of the game, by name; which pick only once the game locks. 404 for an unknown game too.
  async findPredictions(
    id: string,
    gameId: string,
    userId: string,
  ): Promise<GroupMemberPredictionDto[]> {
    await this.visible(id, userId);
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

  // Only its owner may (403, 404 as in update), only for a known game (404) not completed yet (409 GAME_COMPLETED).
  async setGameScore(
    id: string,
    gameId: string,
    userId: string,
    score: number,
  ): Promise<GroupGameScoreDto> {
    await this.owned(id, userId);
    const game = await this.games.findById(gameId);
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (isGameCompleted(game)) {
      throw new ConflictException({
        statusCode: 409,
        message: `Game ${gameId} is completed: its score is set`,
        code: ErrorCode.GAME_COMPLETED,
      });
    }
    await this.gameScores.set({ groupId: id, gameId, score });
    return { gameId, score };
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

  // Only its owner may; a group the caller can't see (or a deleted one) is 404, as in findOne.
  async update(
    id: string,
    userId: string,
    request: UpdateGroupRequest,
  ): Promise<GroupDto> {
    await this.owned(id, userId);
    await this.groups.update(id, request);
    return toGroupDto(await this.visible(id, userId));
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.owned(id, userId);
    await this.groups.delete(id);
  }

  // A private group the caller isn't in is a 404 too, so its id gives nothing away.
  private async visible(id: string, userId: string): Promise<GroupWithMembers> {
    const group = await this.members.findVisibleById(id, userId);
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  private async owned(id: string, userId: string): Promise<void> {
    const { group } = await this.visible(id, userId);
    if (group.ownerId !== userId) {
      throw new ForbiddenException('Only its owner may change a group');
    }
  }
}
