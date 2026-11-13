import { Injectable } from '@nestjs/common';
import { PlayerCreateObject, PlayerEntity } from '@nba/sql-players';
import { TeamPlayerCreateObject, TeamPlayerEntity } from './team-player.entity';
import { TeamPlayerRepo } from './team-player.repo';

@Injectable()
export class TeamPlayerDalService {
  constructor(private readonly repo: TeamPlayerRepo) {}

  // A day's fetch of every roster, in one transaction (here: team_players points at players): the players as fetched,
  // on their team now; anyone else on a team before released (team_id null, never deleted: their days stay); and the
  // day's rows replaced by these, so a second fetch that day leaves only what it saw. `players` must be every roster.
  async replaceRosters(
    date: string,
    players: PlayerCreateObject[],
  ): Promise<void> {
    const ids = players.map((player) => player.id);
    await this.repo.manager.transaction(async (manager) => {
      await manager.upsert(PlayerEntity, players, ['id']);
      await manager
        .createQueryBuilder()
        .update(PlayerEntity)
        .set({ teamId: null })
        .where('team_id IS NOT NULL')
        .andWhere('NOT (id = ANY(:ids))', { ids })
        .execute();
      await manager.delete(TeamPlayerEntity, { date });
      await manager.insert(
        TeamPlayerEntity,
        players.flatMap(({ id, teamId }) =>
          teamId ? [{ date, teamId, playerId: id }] : [],
        ),
      );
    });
  }

  // Records a day's rosters; a day already recorded changes nothing.
  async upsert(rows: TeamPlayerCreateObject[]): Promise<void> {
    await this.repo.upsert(rows, ['date', 'teamId', 'playerId']);
  }

  // A player's days, oldest first: which team they were on, and when.
  findByPlayerId(playerId: string): Promise<TeamPlayerEntity[]> {
    return this.repo.find({
      where: { playerId },
      order: { date: 'ASC', teamId: 'ASC' },
    });
  }

  // A team's roster on a day ('YYYY-MM-DD').
  findByTeamIdAndDate(
    teamId: string,
    date: string,
  ): Promise<TeamPlayerEntity[]> {
    return this.repo.find({
      where: { teamId, date },
      order: { playerId: 'ASC' },
    });
  }
}
