import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresOptions } from '@nba/sql';
import {
  GameCreateObject,
  GameDalService,
  GameModule,
  GameStatus,
} from '@nba/sql-games';
import {
  PlayerCreateObject,
  PlayerDalService,
  PlayerModule,
} from '@nba/sql-players';
import {
  StandingCreateObject,
  StandingDalService,
  StandingModule,
} from '@nba/sql-standings';
import { SeasonDalService, SeasonModule } from '@nba/sql-seasons';
import { TeamPlayerDalService, TeamPlayerModule } from '@nba/sql-team-players';
import { TeamCreateObject, TeamDalService, TeamModule } from '@nba/sql-teams';
import { DataSource } from 'typeorm';
import games from './__fixtures__/games.json';
import players from './__fixtures__/players.json';
import standings from './__fixtures__/standings.json';
import teams from './__fixtures__/teams.json';

// Every table against the real migrations, with API Ninjas' real responses (__fixtures__, from the Postman
// collection's requests). Runs on the local container's `nba_test` database, which it resets: never the dev one.

// ponytail: the provider → row mapping lives here until data-fetcher's client exists; then the spec uses the client's.
type Raw<T> = T extends (infer R)[] ? R : never;
const teamOf = (t: Raw<typeof teams>): TeamCreateObject => ({
  id: t.team_id,
  abbreviation: t.abbreviation,
  name: t.name,
  nickname: t.nickname,
  city: t.city,
  conference: t.conference,
  division: t.division,
  venue: t.venue,
  active: t.active,
});
const playerOf = (p: Raw<typeof players>): PlayerCreateObject => ({
  id: p.player_id,
  teamId: p.team?.team_id ?? null,
  name: p.name,
  firstName: p.first_name,
  lastName: p.last_name,
  position: p.position,
  jerseyNumber: p.jersey_number,
  heightIn: p.height_in,
  weightLb: p.weight_lb,
  birthDate: p.birth_date,
  birthPlace: p.birth_place,
  rosterStatus: p.roster_status,
  college: p.college ?? null, // left out, not null, for players who didn't go to college

  experienceYears: p.experience_years,
});
const gameOf = (g: Raw<typeof games>): GameCreateObject => ({
  id: g.game_id,
  season: g.season,
  seasonType: g.season_type as GameCreateObject['seasonType'],
  date: g.date,
  startTime: new Date(g.start_time),
  status: g.status as GameStatus,
  statusDetail: g.status_detail,
  period: g.period,
  clock: g.clock,
  homeTeamId: g.home_team.team_id,
  awayTeamId: g.away_team.team_id,
  homeScore: g.home_score,
  awayScore: g.away_score,
  periodScores: g.period_scores,
  decidedIn: g.decided_in,
  winnerTeamId: g.winner,
  venue: g.venue,
  neutralSite: g.neutral_site,
  originalDate: g.original_date,
});
const standingOf = (s: Raw<typeof standings>): StandingCreateObject => ({
  season: s.season,
  teamId: s.team.team_id,
  conference: s.conference,
  division: s.division,
  gamesPlayed: s.games_played,
  wins: s.wins,
  losses: s.losses,
  winPct: s.win_pct,
  gamesBehind: s.games_behind,
  pointsFor: s.points_for,
  pointsAgainst: s.points_against,
  pointDifferential: s.point_differential,
  streak: s.streak,
  homeRecord: s.home_record,
  awayRecord: s.away_record,
  divisionRecord: s.division_record,
  conferenceRecord: s.conference_record,
  last10: s.last_10,
  leagueRank: s.league_rank,
  conferenceRank: s.conference_rank,
  divisionRank: s.division_rank,
  final: s.final,
});

describe('schema', () => {
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...postgresOptions({ ...process.env, DB_NAME: 'nba_test' }),
          entities: [],
          autoLoadEntities: true,
          dropSchema: true,
          migrationsRun: true,
        }),
        TeamModule,
        PlayerModule,
        GameModule,
        StandingModule,
        TeamPlayerModule,
        SeasonModule,
      ],
    }).compile();
    dataSource = module.get(DataSource);
  });
  afterAll(() => module?.close());
  // Not seasons: the migrations load them.
  beforeEach(() =>
    dataSource.query('TRUNCATE teams, players, games, standings, team_players'),
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
