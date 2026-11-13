import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { gameOf, teamOf } from '@nba/data-fetcher-api-ninjas-client';
import {
  games,
  players,
  standings,
  teams,
} from '@nba/data-fetcher-api-ninjas-client/fixtures';
import { testPostgresOptions } from '@nba/sql';
import { GameDayDalService } from '@nba/sql-game-days';
import { GameDalService, GameModule, GameStatus } from '@nba/sql-games';
import { PlayerDalService, PlayerModule } from '@nba/sql-players';
import { StandingDalService, StandingModule } from '@nba/sql-standings';
import { StandingHistoryDalService } from '@nba/sql-standings-history';
import { TeamPlayerDalService } from '@nba/sql-team-players';
import { TeamDalService } from '@nba/sql-teams';
import { DataSource } from 'typeorm';
import { daysBetween } from './days';
import { FetchersModule } from './fetchers.module';
import { GamesFetcherService } from './games-fetcher.service';
import { PlayersFetcherService } from './players-fetcher.service';
import { StandingsFetcherService } from './standings-fetcher.service';
import { TeamsFetcherService } from './teams-fetcher.service';

// The fetchers end to end, the real client included, against the test DB: only `fetch` is fake, answering as API
// Ninjas did (the fixtures). The 2026-27 season (2026-10-20 to 2027-04-11) comes from its migration.

type Answer = (url: URL) => unknown;

// Each team's roster: Portland's real one, and for every other team the same players under ids of their own.
const rosterOf = (teamId: string | null) =>
  players.map((player) =>
    teamId === 'nba-por'
      ? player
      : {
          ...player,
          player_id: `${player.player_id}-${teamId}`,
          team: { ...player.team, team_id: teamId },
        },
  );

const provider: Answer = (url) => {
  switch (url.pathname) {
    case '/v1/basketballteams':
      return teams;
    case '/v1/basketballplayers':
      return rosterOf(url.searchParams.get('team'));
    case '/v1/basketballstandings':
      return standings;
    case '/v1/basketballgames':
      return url.searchParams.get('date') === '2026-11-11' ? games : [];
  }
  throw new Error(`Unexpected request: ${url}`);
};

describe('fetchers', () => {
  let module: TestingModule;
  let fetch: jest.SpiedFunction<typeof global.fetch>;

  const answerWith = (answer: Answer) =>
    fetch.mockImplementation(async (input) => {
      const body = answer(new URL(String(input)));
      return body instanceof Response ? body : Response.json(body);
    });
  const requested = (param: string) =>
    fetch.mock.calls.map(([input]) =>
      new URL(String(input)).searchParams.get(param),
    );

  beforeAll(async () => {
    process.env['API_NINJAS_KEY'] = 'test-key';
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testPostgresOptions()),
        FetchersModule,
        PlayerModule,
        GameModule,
        StandingModule,
      ],
    }).compile();
  });
  afterAll(() => module?.close());
  beforeEach(async () => {
    await module
      .get(DataSource)
      .query(
        'TRUNCATE teams, players, games, game_days, standings, standings_history, team_players',
      );
    fetch = jest.spyOn(global, 'fetch');
    answerWith(provider);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env['GAMES_MAX_REQUESTS'];
    delete process.env['SEASON_ID'];
  });

  describe('TeamsFetcherService', () => {
    it('writes every team, and again without duplicates', async () => {
      await module.get(TeamsFetcherService).run();
      await module.get(TeamsFetcherService).run();

      expect(await module.get(TeamDalService).findAll()).toHaveLength(30);
      expect(fetch.mock.calls[0][1]?.headers).toEqual({
        'X-Api-Key': 'test-key',
      });
    });
  });

  describe('PlayersFetcherService', () => {
    const portland = players.map((player) => player.player_id);
    const [traded, released] = portland;

    beforeEach(() => module.get(TeamsFetcherService).run());

    it("writes every team's roster, and the day's team_players", async () => {
      await module.get(PlayersFetcherService).run('2026-11-12');

      expect(requested('team').filter(Boolean)).toHaveLength(30);
      expect(
        await module.get(PlayerDalService).findByTeamId('nba-por'),
      ).toHaveLength(players.length);
      const day = await module
        .get(TeamPlayerDalService)
        .findByTeamIdAndDate('nba-por', '2026-11-12');
      expect(day.map((row) => row.playerId).sort()).toEqual(
        [...portland].sort(),
      );
    });

    it('moves a traded player, releases a dropped one, and keeps earlier days', async () => {
      await module.get(PlayersFetcherService).run('2026-11-12');
      // The next day Portland trades one player to Boston and drops another.
      answerWith((url) =>
        url.searchParams.get('team') === 'nba-por'
          ? players.filter(
              (player) =>
                player.player_id !== traded && player.player_id !== released,
            )
          : url.searchParams.get('team') === 'nba-bos'
            ? [
                ...rosterOf('nba-bos'),
                {
                  ...players[0],
                  team: { ...players[0].team, team_id: 'nba-bos' },
                },
              ]
            : provider(url),
      );
      await module.get(PlayersFetcherService).run('2026-11-13');

      const playerDal = module.get(PlayerDalService);
      const teamPlayers = module.get(TeamPlayerDalService);
      expect(
        (await playerDal.findByTeamId('nba-bos')).map((p) => p.id),
      ).toContain(traded);
      expect(
        (await playerDal.findByTeamId('nba-por')).map((p) => p.id),
      ).not.toContain(released);
      expect(
        (await teamPlayers.findByPlayerId(traded)).map(({ date, teamId }) => [
          date,
          teamId,
        ]),
      ).toEqual([
        ['2026-11-12', 'nba-por'],
        ['2026-11-13', 'nba-bos'],
      ]);
      expect(
        (await teamPlayers.findByPlayerId(released)).map((row) => row.date),
      ).toEqual(['2026-11-12']);
    });

    it("replaces the day's rows when it runs again that day", async () => {
      await module.get(PlayersFetcherService).run('2026-11-13');
      answerWith((url) =>
        url.searchParams.get('team') === 'nba-por'
          ? players.filter((player) => player.player_id !== released)
          : provider(url),
      );
      await module.get(PlayersFetcherService).run('2026-11-13');

      expect(
        await module
          .get(TeamPlayerDalService)
          .findByTeamIdAndDate('nba-por', '2026-11-13'),
      ).toHaveLength(players.length - 1);
      expect(
        await module.get(TeamPlayerDalService).findByPlayerId(released),
      ).toEqual([]);
    });

    it('writes nothing when a roster comes back empty', async () => {
      answerWith((url) =>
        url.searchParams.get('team') === 'nba-uta' ? [] : provider(url),
      );

      await expect(
        module.get(PlayersFetcherService).run('2026-11-12'),
      ).rejects.toThrow("nba-uta's roster came back empty");
      expect(
        await module.get(PlayerDalService).findByTeamId('nba-por'),
      ).toEqual([]);
    });
  });

  describe('StandingsFetcherService', () => {
    beforeEach(() => module.get(TeamsFetcherService).run());

    it("writes the season's standings, and today's row of their history", async () => {
      await module.get(StandingsFetcherService).run('2026-11-12');

      expect(
        await module.get(StandingDalService).findBySeason(2026),
      ).toHaveLength(30);
      expect(
        await module
          .get(StandingHistoryDalService)
          .findByDate(2026, '2026-11-12'),
      ).toHaveLength(30);
    });

    it('keeps a row a day, updates the day on a second run, and the latest in standings', async () => {
      const lakers = standings[0];
      const winning = (wins: number) =>
        answerWith((url) =>
          url.pathname === '/v1/basketballstandings'
            ? [{ ...lakers, wins }, ...standings.slice(1)]
            : provider(url),
        );
      winning(11);
      await module.get(StandingsFetcherService).run('2026-11-12');
      winning(12);
      await module.get(StandingsFetcherService).run('2026-11-13');
      winning(13);
      await module.get(StandingsFetcherService).run('2026-11-13');

      expect(
        (
          await module
            .get(StandingHistoryDalService)
            .findByTeam(2026, lakers.team.team_id)
        ).map(({ date, wins }) => [date, wins]),
      ).toEqual([
        ['2026-11-12', 11],
        ['2026-11-13', 13],
      ]);
      expect(
        (await module.get(StandingDalService).findBySeason(2026))[0],
      ).toMatchObject({ teamId: lakers.team.team_id, wins: 13 });
    });
  });

  describe('GamesFetcherService', () => {
    beforeEach(() => module.get(TeamDalService).upsert(teams.map(teamOf)));

    const season = daysBetween('2026-10-20', '2027-04-11');
    const checkedDays = async () => [
      ...(
        await module
          .get(GameDayDalService)
          .findBetween('2026-10-20', '2027-04-11')
      ).keys(),
    ];

    // A game on each of the season's days, final with its score before `scoredBefore`, and every day checked.
    const seedSeason = async (scoredBefore: string) => {
      await module
        .get(GameDayDalService)
        .record(
          season.map((date) => ({ date, games: 1, checkedOn: '2026-10-01' })),
        );
      await module.get(GameDalService).upsert(
        season.map((day) => ({
          ...gameOf(games[0]),
          id: `nba-test-${day}`,
          date: day,
          startTime: new Date(`${day}T23:00:00Z`),
          ...(day < scoredBefore
            ? {}
            : {
                status: GameStatus.SCHEDULED,
                homeScore: null,
                awayScore: null,
                periodScores: null,
                decidedIn: null,
                winnerTeamId: null,
              }),
        })),
      );
    };

    it('fetches the days without games one at a time, nearest to today first, up to the limit', async () => {
      process.env['GAMES_MAX_REQUESTS'] = '5';
      await module.get(GamesFetcherService).run('2026-11-12');

      expect(requested('date')).toEqual([
        '2026-11-12',
        '2026-11-11',
        '2026-11-13',
        '2026-11-10',
        '2026-11-14',
      ]);
      expect(
        await module.get(GameDalService).findByDate('2026-11-11'),
      ).toHaveLength(games.length);
    });

    it('fetches again from the last day with scores to today, and nothing else the season has', async () => {
      await seedSeason('2026-11-09');
      process.env['GAMES_MAX_REQUESTS'] = '1000';
      await module.get(GamesFetcherService).run('2026-11-12');

      expect(requested('date')).toEqual([
        '2026-11-12',
        '2026-11-11',
        '2026-11-10',
        '2026-11-09',
        '2026-11-08',
      ]);
      // 11-11's games came back final, so the scores start there; 11-12 came back empty on its day.
      fetch.mockClear();
      await module.get(GamesFetcherService).run('2026-11-12');
      expect(requested('date')).toEqual(['2026-11-11']);
    });

    it('records every day it fetched, and asks for an empty one only once', async () => {
      process.env['GAMES_MAX_REQUESTS'] = '1000';
      await module.get(GamesFetcherService).run('2026-11-12');

      expect(requested('date')).toHaveLength(season.length);
      expect(await checkedDays()).toHaveLength(season.length);
      expect(
        (
          await module
            .get(GameDayDalService)
            .findBetween('2026-11-11', '2026-11-12')
        ).get('2026-11-11'),
      ).toMatchObject({ games: games.length, checkedOn: '2026-11-12' });

      // Only 11-11, the last day with scores: the other days were found empty, or are to come and have been checked.
      fetch.mockClear();
      await module.get(GamesFetcherService).run('2026-11-12');
      expect(requested('date')).toEqual(['2026-11-11']);
    });

    it('asks again on its day for a day found empty before it came', async () => {
      process.env['GAMES_MAX_REQUESTS'] = '1000';
      await module.get(GamesFetcherService).run('2026-11-12');
      fetch.mockClear();
      await module.get(GamesFetcherService).run('2026-11-13');

      // 11-13 was empty when checked on 11-12 (its schedule may have come since); 11-12 was empty on its day.
      expect(requested('date')).toEqual(['2026-11-13', '2026-11-11']);
    });

    it('fetches from the season start when no game has a score, and never a future day it has', async () => {
      await seedSeason('2026-10-20');
      process.env['GAMES_MAX_REQUESTS'] = '1000';
      await module.get(GamesFetcherService).run('2026-11-12');

      const days = requested('date');
      expect(days).toEqual(daysBetween('2026-10-20', '2026-11-12').reverse());
    });

    it('stops at the quota, without failing', async () => {
      answerWith(() =>
        Response.json({ error: 'Quota exceeded' }, { status: 429 }),
      );

      await module.get(GamesFetcherService).run('2026-11-12');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('goes on past a failed day, and fails the run at the end', async () => {
      process.env['GAMES_MAX_REQUESTS'] = '3';
      answerWith((url) =>
        url.searchParams.get('date') === '2026-11-12'
          ? Response.json({ error: 'Server error' }, { status: 500 })
          : provider(url),
      );

      await expect(
        module.get(GamesFetcherService).run('2026-11-12'),
      ).rejects.toThrow('Games failed for 2026-11-12');
      expect(requested('date')).toEqual([
        '2026-11-12',
        '2026-11-11',
        '2026-11-13',
      ]);
      expect(
        await module.get(GameDalService).findByDate('2026-11-11'),
      ).toHaveLength(games.length);
      // The failed day isn't recorded, so the next run asks for it again.
      expect((await checkedDays()).sort()).toEqual([
        '2026-11-11',
        '2026-11-13',
      ]);
    });

    it('fetches SEASON_ID, and refuses an unknown one', async () => {
      process.env['SEASON_ID'] = 'nba-1999-00';

      await expect(
        module.get(GamesFetcherService).run('2026-11-12'),
      ).rejects.toThrow('No season nba-1999-00 (SEASON_ID)');
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
