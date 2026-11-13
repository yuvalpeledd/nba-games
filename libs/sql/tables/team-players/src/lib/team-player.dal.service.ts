import { Injectable } from '@nestjs/common';
import { upsertCounted, WriteCounts } from '@nba/sql-core';
import { PlayerCreateObject, PlayerEntity } from '@nba/sql-players';
import { TeamPlayerCreateObject, TeamPlayerEntity } from './team-player.entity';
import { TeamPlayerRepo } from './team-player.repo';

// What replaceRosters did.
export interface RostersWritten {
  // The players fetched, and how many on a team before but on no roster now were released (team_id null).
  players: WriteCounts & { released: number };
  // The day's team_players rows: the new ones inserted, the ones no longer on a roster deleted.
  teamPlayers: { inserted: number; deleted: number; unchanged: number };
}

@Injectable()
export class TeamPlayerDalService {
  constructor(private readonly repo: TeamPlayerRepo) {}

  // A day's fetch of every roster, in one transaction (here: team_players points at players): the players as fetched,
  // on their team now; anyone else on a team before released (team_id null, never deleted: their days stay); and the
  // day's rows made these, so a second fetch that day leaves only what it saw. `players` must be every roster.
  async replaceRosters(
    date: string,
    players: PlayerCreateObject[],
  ): Promise<RostersWritten> {
    const ids = players.map((player) => player.id);
    const rows = players.flatMap(({ id, teamId }) =>
      teamId ? [{ date, teamId, playerId: id }] : [],
    );
    const keys = rows.map(({ teamId, playerId }) => `${teamId}/${playerId}`);
    return this.repo.manager.transaction(async (manager) => {
      const written = await upsertCounted(manager, PlayerEntity, players, [
        'id',
      ]);
      const released = await manager
        .createQueryBuilder()
        .update(PlayerEntity)
        .set({ teamId: null })
        .where('team_id IS NOT NULL')
        .andWhere('NOT (id = ANY(:ids))', { ids })
        .execute();
      const deleted = await manager
        .createQueryBuilder()
        .delete()
        .from(TeamPlayerEntity)
        .where('date = :date', { date })
        .andWhere("NOT (team_id || '/' || player_id = ANY(:keys))", { keys })
        .execute();
      const inserted = rows.length
        ? await manager
            .createQueryBuilder()
            .insert()
            .into(TeamPlayerEntity)
            .values(rows)
            .orIgnore()
            .returning('player_id')
            .execute()
        : { raw: [] };
      const added = (inserted.raw as unknown[]).length;
      return {
        players: { ...written, released: released.affected ?? 0 },
        teamPlayers: {
          inserted: added,
          deleted: deleted.affected ?? 0,
          unchanged: rows.length - added,
        },
      };
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
