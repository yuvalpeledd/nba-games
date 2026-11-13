import { Injectable } from '@nestjs/common';
import { PlayerCreateObject, PlayerEntity } from './player.entity';
import { PlayerRepo } from './player.repo';

@Injectable()
export class PlayerDalService {
  constructor(private readonly repo: PlayerRepo) {}

  // Inserts new players and overwrites known ones (by the provider's id), their team included: a traded player moves.
  async upsert(players: PlayerCreateObject[]): Promise<void> {
    await this.repo.upsert(players, ['id']);
  }

  findByTeamId(teamId: string): Promise<PlayerEntity[]> {
    return this.repo.find({
      where: { teamId },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }
}
