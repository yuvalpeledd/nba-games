import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { testPostgresOptions } from '@nba/sql';
import { GameDayDalService, GameDayModule } from '@nba/sql-game-days';
import { GameDalService, GameModule, GameStatus } from '@nba/sql-games';
import { PlayerDalService, PlayerModule } from '@nba/sql-players';
import { StandingDalService, StandingModule } from '@nba/sql-standings';
import { ScanDalService, ScanModule } from '@nba/sql-scans';
import { SeasonDalService, SeasonModule } from '@nba/sql-seasons';
import {
  StandingHistoryDalService,
  StandingHistoryModule,
} from '@nba/sql-standings-history';
import { TeamPlayerDalService, TeamPlayerModule } from '@nba/sql-team-players';
import { TeamDalService, TeamModule } from '@nba/sql-teams';
import { UserDalService, UserModule } from '@nba/sql-users';
import {
  PredictionDalService,
  PredictionModule,
  PredictionPick,
} from '@nba/sql-predictions';
import {
  GroupMemberDalService,
  GroupMemberModule,
} from '@nba/sql-group-members';
import { GroupModule, GroupStatus } from '@nba/sql-groups';
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
// the specs' database (TEST_DB_NAME, this checkout's own), which it rebuilds: never the dev one.

describe('schema', () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({ useFactory: testPostgresOptions }),
        TeamModule,
        PlayerModule,
        GameModule,
        StandingModule,
        TeamPlayerModule,
        SeasonModule,
        StandingHistoryModule,
        GameDayModule,
        UserModule,
        ScanModule,
        PredictionModule,
        GroupModule,
        GroupMemberModule,
      ],
    }).compile();
    dataSource = module.get(DataSource);
  });
  afterAll(() => module?.close());
  // Not seasons: the migrations load them.
  beforeEach(() =>
    dataSource.query(
      'TRUNCATE teams, players, games, game_days, standings, standings_history, team_players, users, scans, predictions, groups, group_members',
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

    it('counts what an upsert added and updated, and leaves an unchanged row alone', async () => {
      const dal = module.get(TeamDalService);
      const rows = teams.map(teamOf);
      expect(await dal.upsert(rows)).toEqual({
        inserted: 30,
        updated: 0,
        unchanged: 0,
      });
      const before = await dal.findById(rows[1].id);

      expect(
        await dal.upsert([{ ...rows[0], city: 'Moved' }, ...rows.slice(1)]),
      ).toEqual({ inserted: 0, updated: 1, unchanged: 29 });
      // updated_at moves only on a change.
      expect((await dal.findById(rows[1].id))?.updatedAt).toEqual(
        before?.updatedAt,
      );
      expect(
        (await dal.findById(rows[0].id))?.updatedAt?.getTime(),
      ).toBeGreaterThan(before?.updatedAt?.getTime() ?? 0);
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

  describe('game_days', () => {
    it('records a checked day once, with its latest count', async () => {
      const dal = module.get(GameDayDalService);
      await dal.record([
        { date: '2026-11-26', games: 0, checkedOn: '2026-11-20' },
      ]);
      await dal.record([
        { date: '2026-11-26', games: 0, checkedOn: '2026-11-26' },
      ]);

      expect([
        ...(await dal.findBetween('2026-11-01', '2026-11-30')).values(),
      ]).toMatchObject([
        { date: '2026-11-26', games: 0, checkedOn: '2026-11-26' },
      ]);
    });

    it('is filled from the games already stored when its migration runs', async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      await module.get(GameDalService).upsert(games.map(gameOf));
      const migration = dataSource.migrations.find((m) =>
        m.name?.startsWith('GameDays'),
      );
      const runner = dataSource.createQueryRunner();
      try {
        await migration?.down(runner);
        await migration?.up(runner);
      } finally {
        await runner.release();
      }

      expect(
        (
          await module
            .get(GameDayDalService)
            .findBetween('2026-11-11', '2026-11-11')
        ).get('2026-11-11'),
      ).toMatchObject({
        games: games.length,
        checkedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
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

  describe('users', () => {
    const user = {
      name: 'Dana Levi',
      email: ' Dana@NBA.dev',
      firebaseUid: 'firebase-dana',
    };

    it('stores the email lower-cased and finds them by it, their id or their Firebase account', async () => {
      const dal = module.get(UserDalService);
      const { id } = await dal.create(user);

      const expected = { id, name: 'Dana Levi', email: 'dana@nba.dev' };
      expect(await dal.findById(id)).toMatchObject(expected);
      expect(await dal.findByEmail('DANA@nba.dev')).toMatchObject(expected);
      expect(await dal.findByFirebaseUid('firebase-dana')).toMatchObject(
        expected,
      );
    });

    it('keeps one user per email and per Firebase account', async () => {
      const dal = module.get(UserDalService);
      await dal.create(user);

      await expect(
        dal.create({ ...user, firebaseUid: 'firebase-other' }),
      ).rejects.toThrow(/duplicate key/);
      await expect(
        dal.create({ ...user, email: 'other@nba.dev' }),
      ).rejects.toThrow(/duplicate key/);
    });
  });

  describe('predictions', () => {
    it("keeps one pick per user and game, replaced by the next, and reads a user's by season", async () => {
      await module.get(TeamDalService).upsert(teams.map(teamOf));
      await module.get(GameDalService).upsert(games.map(gameOf));
      const { id: userId } = await module.get(UserDalService).create({
        name: 'Dana Levi',
        email: 'dana@nba.dev',
        firebaseUid: 'firebase-dana',
      });
      const dal = module.get(PredictionDalService);
      const gameId = games[0].game_id;

      await dal.set({ userId, gameId, pick: PredictionPick.HOME });
      await dal.set({ userId, gameId, pick: null });

      expect(await dal.findBySeason(userId, games[0].season)).toMatchObject([
        { userId, gameId, pick: null },
      ]);
      expect(await dal.findBySeason(userId, games[0].season - 1)).toEqual([]);
    });
  });

  describe('groups', () => {
    it('makes a group with its owner in it, and lists the public ones and those a user is in', async () => {
      const users = module.get(UserDalService);
      const dana = await users.create({
        name: 'Dana Levi',
        email: 'dana@nba.dev',
        firebaseUid: 'firebase-dana',
      });
      const omer = await users.create({
        name: 'Omer Cohen',
        email: 'omer@nba.dev',
        firebaseUid: 'firebase-omer',
      });
      const dal = module.get(GroupMemberDalService);

      const group = await dal.createGroup({
        name: 'Friday League',
        ownerId: dana.id,
        public: false,
      });
      await dal.createGroup({ name: 'Open', ownerId: omer.id, public: true });

      expect(group).toMatchObject({ status: GroupStatus.ACTIVE });
      expect(await dal.findVisibleTo(dana.id)).toMatchObject([
        { group: { name: 'Friday League', owner: { name: 'Dana Levi' } } },
        { group: { name: 'Open' }, memberCount: 1 },
      ]);
      expect(
        (await dal.findVisibleTo(omer.id)).map(({ group }) => group.name),
      ).toEqual(['Open']);
    });
  });

  describe('scans', () => {
    it('records a scan and finds the latest to start', async () => {
      const dal = module.get(ScanDalService);
      const scan = { success: true, inserted: 1, updated: 2, unchanged: 3 };
      expect(await dal.findLast()).toBeNull();

      await dal.record({
        ...scan,
        startedAt: new Date('2026-11-13T10:00:00Z'),
        finishedAt: new Date('2026-11-13T10:01:00Z'),
        error: null,
      });
      await dal.record({
        ...scan,
        startedAt: new Date('2026-11-12T10:00:00Z'),
        finishedAt: new Date('2026-11-12T10:01:00Z'),
        error: 'GamesFetcherService: Games failed for 2026-11-11',
      });

      expect(await dal.findLast()).toMatchObject({
        ...scan,
        startedAt: new Date('2026-11-13T10:00:00Z'),
        error: null,
      });
    });
  });
});
