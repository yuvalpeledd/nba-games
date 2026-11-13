import { Injectable } from '@nestjs/common';
import { upsertCounted, WriteCounts } from '@nba/sql-core';
import { PlayerCreateObject, PlayerEntity } from './player.entity';
import { PlayerRepo } from './player.repo';

@Injectable()
export class PlayerDalService {
  constructor(private readonly repo: PlayerRepo) {}

  // Inserts new players and updates the known ones that changed (by the provider's id), their team included: a traded player moves.
  async upsert(players: PlayerCreateObject[]): Promise<WriteCounts> {
    return upsertCounted(this.repo.manager, PlayerEntity, players, ['id']);
  }

  findByTeamId(teamId: string): Promise<PlayerEntity[]> {
    return this.repo.find({
      where: { teamId },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  findById(id: string): Promise<PlayerEntity | null> {
    return this.repo.findOneBy({ id });
  }

  // A page of players by name, only a team's when `teamId` is given.
  findPage({
    teamId,
    limit,
    offset,
  }: {
    teamId?: string;
    limit: number;
    offset: number;
  }): Promise<PlayerEntity[]> {
    return this.repo.find({
      where: teamId ? { teamId } : {},
      order: { lastName: 'ASC', firstName: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
  }
}
