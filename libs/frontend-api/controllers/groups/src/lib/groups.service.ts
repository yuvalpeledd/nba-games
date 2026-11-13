import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CreateGroupRequest,
  GroupDetailsDto,
  GroupDto,
  GroupMemberPredictionDto,
  UpdateGroupRequest,
} from '@nba/dtos-groups';
import { isPredictionLocked } from '@nba/dtos-predictions';
import { stackOf } from '@nba/frontend-api-common';
import { GameDalService } from '@nba/sql-games';
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

const SCORE_TIMEOUT_MS = 10_000;

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
  private readonly scoreManagerUrl =
    process.env['SCORE_MANAGER_URL'] ?? 'http://localhost:3001';

  constructor(
    private readonly groups: GroupDalService,
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
    const group = await this.visible(id, userId);
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

  // Each member's pick of the game, by name; which pick only once the game locks. 404 for an unknown game too, 403
  // for a public group the caller isn't in (only members see each other's picks).
  async findPredictions(
    id: string,
    gameId: string,
    userId: string,
  ): Promise<GroupMemberPredictionDto[]> {
    const { isMember } = await this.visible(id, userId);
    if (!isMember) {
      throw new ForbiddenException("Only a group's members see their picks");
    }
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

  // The caller joins a group they see, then score-manager scores their past picks there (so they count from the
  // start); if it can't, the join is undone (503: try again), so no member is missing scores. A member already: a no-op.
  // ponytail: no retry but the caller's; add one if score-manager's blips show up.
  async join(id: string, userId: string): Promise<GroupDto> {
    const { isMember } = await this.visible(id, userId);
    if (!isMember) {
      await this.members.join(id, userId);
      try {
        const response = await fetch(
          `${this.scoreManagerUrl}/api/groups/${id}/users/${userId}/score`,
          { method: 'POST', signal: AbortSignal.timeout(SCORE_TIMEOUT_MS) },
        );
        if (!response.ok) {
          throw new Error(`score-manager answered ${response.status}`);
        }
      } catch (error) {
        await this.members.leave(id, userId);
        this.logger.error(
          `Joining ${id}: scoring ${userId} failed, join undone`,
          stackOf(error),
        );
        throw new ServiceUnavailableException(
          "Couldn't join the group: try again",
        );
      }
    }
    return toGroupDto(await this.visible(id, userId));
  }

  // The caller leaves a group they're in (not being in it, a no-op); its owner can't (they delete it instead).
  async leave(id: string, userId: string): Promise<void> {
    const { group } = await this.visible(id, userId);
    if (group.ownerId === userId) {
      throw new ConflictException(
        "A group's owner can't leave it: delete it instead",
      );
    }
    await this.members.leave(id, userId);
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
