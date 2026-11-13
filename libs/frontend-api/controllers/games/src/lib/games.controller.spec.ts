import { GameStatus, SeasonType } from '@nba/sql-games/enums';
import { TestApp } from '@nba/frontend-api-test-utils';
import { FrontendApiGamesControllerModule } from './games.module';

// A seeded game as the API answers it (startTime as ISO).
const asDto = <T extends { startTime: Date }>(game: T) => ({
  ...game,
  startTime: game.startTime.toISOString(),
});

describe('GamesController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiGamesControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(() => app.clearDatabase());

  describe('GET /games', () => {
    describe('validation', () => {
      it.each([
        ['', 'from is a required field'],
        ['from=11/11/2026', 'from must be a date (YYYY-MM-DD)'],
        ['from=2026-02-30', 'from must be a date (YYYY-MM-DD)'],
        ['from=2026-11-11&to=tomorrow', 'to must be a date (YYYY-MM-DD)'],
        ['from=2026-11-11&to=2026-11-10', 'to must not be before from'],
        [
          'from=2026-11-01&to=2026-12-02',
          'from and to must be at most 31 days apart',
        ],
        [
          `from=2026-11-11&teamId=${'x'.repeat(101)}`,
          'teamId must be at most 100 characters',
        ],
        ['season=last&teamId=nba-bos', 'season must be a year'],
        ['season=2026.5&teamId=nba-bos', 'season must be a year'],
        [
          'season=2026&teamId=nba-bos&from=2026-11-11',
          'season cannot be combined with from or to',
        ],
        [
          'season=2026&teamId=nba-bos&to=2026-11-11',
          'season cannot be combined with from or to',
        ],
        ['opponentId=nba-nyk', 'teamId is required with opponentId'],
        [
          'teamId=nba-bos&opponentId=nba-nyk&from=2026-11-11',
          'opponentId cannot be combined with from, to or season',
        ],
        [
          'teamId=nba-bos&opponentId=nba-nyk&season=2026',
          'opponentId cannot be combined with from, to or season',
        ],
        [
          `teamId=nba-bos&opponentId=${'x'.repeat(101)}`,
          'opponentId must be at most 100 characters',
        ],
      ])('refuses ?%s', async (query, message) => {
        const { status, body } = await app.call('GET', `/games?${query}`);

        expect(status).toBe(400);
        expect(body.message).toEqual([message]);
      });

      it('takes a 31-day range', async () => {
        const { status } = await app.call(
          'GET',
          '/games?from=2026-11-01&to=2026-12-01',
        );

        expect(status).toBe(200);
      });
    });

    describe('behavior', () => {
      it("answers a day's games in tip-off order", async () => {
        const [home, away] = [await app.createTeam(), await app.createTeam()];
        const late = await app.createGame(home.id, away.id, {
          startTime: new Date('2026-11-12T03:00:00Z'),
        });
        const early = await app.createGame(away.id, home.id, {
          startTime: new Date('2026-11-12T00:00:00Z'),
        });
        await app.createGame(home.id, away.id, { date: '2026-11-12' });

        const { status, body } = await app.call(
          'GET',
          '/games?from=2026-11-11',
        );

        expect(status).toBe(200);
        expect(body).toEqual({ data: [early, late].map(asDto) });
      });

      it('answers a range by day, both ends included', async () => {
        const [home, away] = [await app.createTeam(), await app.createTeam()];
        const games = [];
        for (const date of [
          '2026-11-10',
          '2026-11-11',
          '2026-11-12',
          '2026-11-13',
        ]) {
          games.push(await app.createGame(home.id, away.id, { date }));
        }

        const { body } = await app.call(
          'GET',
          '/games?from=2026-11-11&to=2026-11-12',
        );

        expect(body.data).toEqual(games.slice(1, 3).map(asDto));
      });

      it("answers only a team's games, home and away, with teamId", async () => {
        const [team, b, c] = [
          await app.createTeam(),
          await app.createTeam(),
          await app.createTeam(),
        ];
        const home = await app.createGame(team.id, b.id, {
          startTime: new Date('2026-11-11T23:00:00Z'),
        });
        const away = await app.createGame(c.id, team.id, {
          date: '2026-11-12',
        });
        await app.createGame(b.id, c.id);

        const { body } = await app.call(
          'GET',
          `/games?from=2026-11-11&to=2026-11-12&teamId=${team.id}`,
        );

        expect(body.data).toEqual([home, away].map(asDto));
      });

      it("answers a team's whole season, by day, with season and teamId", async () => {
        const [team, b, c] = [
          await app.createTeam(),
          await app.createTeam(),
          await app.createTeam(),
        ];
        const playoff = await app.createGame(b.id, team.id, {
          date: '2027-05-01',
          seasonType: SeasonType.POSTSEASON,
        });
        const opener = await app.createGame(team.id, c.id, {
          date: '2026-10-21',
        });
        await app.createGame(team.id, b.id, {
          season: 2025,
          date: '2026-04-01',
        });
        await app.createGame(b.id, c.id);

        const { status, body } = await app.call(
          'GET',
          `/games?season=2026&teamId=${team.id}`,
        );

        expect(status).toBe(200);
        expect(body.data).toEqual([opener, playoff].map(asDto));
      });

      it("answers the league's whole season, by day, with season alone", async () => {
        const [a, b, c] = [
          await app.createTeam(),
          await app.createTeam(),
          await app.createTeam(),
        ];
        const later = await app.createGame(b.id, c.id, { date: '2026-11-02' });
        const opener = await app.createGame(a.id, b.id, {
          date: '2026-10-21',
        });
        await app.createGame(a.id, c.id, { season: 2025, date: '2026-04-01' });

        const { status, body } = await app.call('GET', '/games?season=2026');

        expect(status).toBe(200);
        expect(body.data).toEqual([opener, later].map(asDto));
      });

      it('answers every game between two teams, either at home, every season, with teamId and opponentId', async () => {
        const [team, opponent, other] = [
          await app.createTeam(),
          await app.createTeam(),
          await app.createTeam(),
        ];
        const lastSeason = await app.createGame(opponent.id, team.id, {
          season: 2025,
          date: '2026-02-01',
        });
        const home = await app.createGame(team.id, opponent.id, {
          date: '2026-11-11',
        });
        await app.createGame(team.id, other.id);
        await app.createGame(opponent.id, other.id);

        const { status, body } = await app.call(
          'GET',
          `/games?teamId=${team.id}&opponentId=${opponent.id}`,
        );

        expect(status).toBe(200);
        expect(body.data).toEqual([lastSeason, home].map(asDto));
      });
    });
  });

  describe('GET /games/:id', () => {
    describe('validation', () => {
      it('refuses an id over 100 characters', async () => {
        const { status, body } = await app.call(
          'GET',
          `/games/${'x'.repeat(101)}`,
        );

        expect(status).toBe(400);
        expect(body.message).toEqual(['id must be at most 100 characters']);
      });
    });

    describe('behavior', () => {
      it('answers a final game with its scores', async () => {
        const [home, away] = [await app.createTeam(), await app.createTeam()];
        const game = await app.createGame(home.id, away.id, {
          status: GameStatus.FINAL,
          homeScore: 110,
          awayScore: 102,
          periodScores: { home: [30, 25, 28, 27], away: [24, 26, 25, 27] },
          decidedIn: 'regulation',
          winnerTeamId: home.id,
        });

        expect(await app.call('GET', `/games/${game.id}`)).toEqual({
          status: 200,
          body: { data: asDto(game) },
        });
      });

      it('answers 404 for an unknown game', async () => {
        const { status, body } = await app.call(
          'GET',
          '/games/nba-20261111-x-y',
        );

        expect(status).toBe(404);
        expect(body.message).toBe('Game nba-20261111-x-y not found');
      });
    });
  });
});
