import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { testPostgresOptions } from '@nba/sql';
import { GameDalService, GameModule, GameStatus } from '@nba/sql-games';
import { PlayerDalService, PlayerModule } from '@nba/sql-players';
import { StandingDalService, StandingModule } from '@nba/sql-standings';
import { SeasonDalService, SeasonModule } from '@nba/sql-seasons';
import {
  StandingHistoryDalService,
  StandingHistoryModule,
} from '@nba/sql-standings-history';
import { TeamPlayerDalService, TeamPlayerModule } from '@nba/sql-team-players';
import { TeamDalService, TeamModule } from '@nba/sql-teams';
import { DataSource } from 'typeorm';
import {
  gameOf,
  playerOf,
  standingOf,
  teamOf,
} from '@nba/data-fetcher-api-ninjas-client';
import {
  games,
  players,
  standings,
  teams,
} from '@nba/data-fetcher-api-ninjas-client/fixtures';

// Every table against the real migrations, with API Ninjas' real responses mapped by the client's mappers. Runs on
// the local container's `nba_test` database, which it rebuilds: never the dev one.

describe('schema', () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testPostgresOptions()),
        TeamModule,
        PlayerModule,
        GameModule,
        StandingModule,
        TeamPlayerModule,
        SeasonModule,
        StandingHistoryModule,
      ],
    }).compile();
    dataSource = module.get(DataSource);
  });
  afterAll(() => module?.close());
  // Not seasons: the migrations load them.
  beforeEach(() =>
    dataSource.query(
      'TRUNCATE teams, players, games, standings, standings_history, team_players',
    ),
  );

  describe('migrations', () => {
    it('match the entities', async () => {
      const { upQueries } = await dataSource.driver.createSchemaBuilder().log();
      expect(upQueries.map(({ query }) => query)).toEqual([]);
    });

    it('revert and run again', async () => {
      await dataSource.undoLastMigration();
      await dataSource.runMigrations();
      expect(await dataSource.showMigrations()).toBe(false);
    });
  });

  describe('teams', () => {
    it('upserts by id', async () => {
      const dal = module.get(TeamDalService);
      await dal.upsert(teams.map(teamOf));
      await dal.upsert([{ ...teamOf(teams[0]), city: 'Moved' }]);

      expect(await dal.findAll()).toHaveLength(teams.length);
      expect(await dal.findById(teams[0].team_id)).toMatchObject({
        ...teamOf(teams[0]),
        city: 'Moved',
      });
    });
  });

  describe('players', () => {
    it('upserts by id, onto their team', async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      const dal = module.get(PlayerDalService);
      await dal.upsert(players.map(playerOf));
      await dal.upsert(players.map(playerOf));

      const roster = await dal.findByTeamId('nba-por');
      expect(roster).toHaveLength(players.length);
      expect(roster).toContainEqual(
        expect.objectContaining(playerOf(players[0])),
      );
    });

    it('moves a traded player', async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      const dal = module.get(PlayerDalService);
      await dal.upsert([playerOf(players[0])]);
      await dal.upsert([{ ...playerOf(players[0]), teamId: 'nba-bos' }]);

      expect(await dal.findByTeamId('nba-por')).toEqual([]);
      expect(await dal.findByTeamId('nba-bos')).toHaveLength(1);
    });
  });

  describe('games', () => {
    it("upserts by id, and reads a day's games in tip-off order", async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      const dal = module.get(GameDalService);
      await dal.upsert(games.map(gameOf));
      await dal.upsert([{ ...gameOf(games[0]), homeScore: 100 }]);

      const day = await dal.findByDate('2026-11-11');
      expect(day).toHaveLength(games.length);
      const times = day.map((game) => game.startTime.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(day.find((game) => game.id === games[0].game_id)).toMatchObject({
        ...gameOf(games[0]),
        homeScore: 100,
      });
    });

    it('keeps a game scheduled for later without a score', async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      const dal = module.get(GameDalService);
      await dal.upsert([
        {
          ...gameOf(games[0]),
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
          periodScores: null,
          period: null,
          decidedIn: null,
          winnerTeamId: null,
        },
      ]);

      expect(await dal.findByDate(games[0].date)).toMatchObject([
        { status: GameStatus.SCHEDULED, homeScore: null, winnerTeamId: null },
      ]);
    });
  });

  describe('standings', () => {
    it('upserts by season and team, in league order', async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      const dal = module.get(StandingDalService);
      await dal.upsert(standings.map(standingOf));
      await dal.upsert([{ ...standingOf(standings[0]), wins: 12 }]);
      await dal.upsert([{ ...standingOf(standings[0]), season: 2025 }]);

      const season = await dal.findBySeason(2026);
      expect(season).toHaveLength(standings.length);
      expect(season.map((row) => row.leagueRank)).toEqual(
        [...season.map((row) => row.leagueRank)].sort((a, b) => a - b),
      );
      expect(season[0]).toMatchObject({
        ...standingOf(standings[0]),
        wins: 12,
      });
      expect(await dal.findBySeason(2025)).toHaveLength(1);
    });
  });

  describe('seasons', () => {
    it('has the current season, from its migration', async () => {
      expect(
        await module.get(SeasonDalService).findById('nba-2026-27'),
      ).toMatchObject({
        id: 'nba-2026-27',
        name: 'NBA 2026-2027',
        startDate: '2026-10-20',
        endDate: '2027-04-11',
      });
    });

    it('finds the season a day falls in, its first and last days included', async () => {
      const dal = module.get(SeasonDalService);
      for (const day of ['2026-10-20', '2026-11-13', '2027-04-11']) {
        expect(await dal.findByDate(day)).toMatchObject({ id: 'nba-2026-27' });
      }
      expect(await dal.findByDate('2026-10-19')).toBeNull();
      expect(await dal.findByDate('2027-04-12')).toBeNull();
    });
  });

  describe('standings_history', () => {
    it("records a day's standings with the latest in standings, a day's row once", async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      const dal = module.get(StandingHistoryDalService);
      const rows = standings.map(standingOf);
      await dal.recordStandings('2026-11-12', rows);
      await dal.recordStandings('2026-11-12', rows);
      await dal.recordStandings('2026-11-13', [{ ...rows[0], wins: 12 }]);

      expect(await dal.findByDate(2026, '2026-11-12')).toHaveLength(
        standings.length,
      );
      expect(
        (await dal.findByTeam(2026, rows[0].teamId)).map((row) => row.wins),
      ).toEqual([rows[0].wins, 12]);
      expect(
        (await module.get(StandingDalService).findBySeason(2026))[0],
      ).toMatchObject({ teamId: rows[0].teamId, wins: 12 });
    });
  });

  describe('team_players', () => {
    beforeEach(async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      await module.get(PlayerDalService).upsert(players.map(playerOf));
    });

    it("records a day's roster once", async () => {
      const dal = module.get(TeamPlayerDalService);
      const roster = players.map((p) => ({
        date: '2026-11-12',
        teamId: 'nba-por',
        playerId: p.player_id,
      }));
      await dal.upsert(roster);
      await dal.upsert(roster);

      expect(
        await dal.findByTeamIdAndDate('nba-por', '2026-11-12'),
      ).toHaveLength(players.length);
      expect(await dal.findByTeamIdAndDate('nba-por', '2026-11-13')).toEqual(
        [],
      );
    });

    it("keeps a traded player's days on each team, oldest first", async () => {
      const dal = module.get(TeamPlayerDalService);
      const playerId = players[0].player_id;
      await dal.upsert([
        { date: '2026-11-13', teamId: 'nba-bos', playerId },
        { date: '2026-11-11', teamId: 'nba-por', playerId },
        { date: '2026-11-12', teamId: 'nba-por', playerId },
        // The trade's day: a fetch before it and one after.
        { date: '2026-11-12', teamId: 'nba-bos', playerId },
      ]);

      expect(
        (await dal.findByPlayerId(playerId)).map(({ date, teamId }) => [
          date,
          teamId,
        ]),
      ).toEqual([
        ['2026-11-11', 'nba-por'],
        ['2026-11-12', 'nba-bos'],
        ['2026-11-12', 'nba-por'],
        ['2026-11-13', 'nba-bos'],
      ]);
    });

    it('refuses an unknown player', async () => {
      await expect(
        module
          .get(TeamPlayerDalService)
          .upsert([
            { date: '2026-11-12', teamId: 'nba-por', playerId: 'nba-p-none' },
          ]),
      ).rejects.toThrow(/foreign key/);
    });
  });
});
