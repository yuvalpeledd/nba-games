import { ErrorCode } from '@nba/enums';
import { TestApp, TestUser } from '@nba/frontend-api-test-utils';
import { GameStatus } from '@nba/sql-games';
import { PredictionDalService, PredictionPick } from '@nba/sql-predictions';
import { FrontendApiPredictionsControllerModule } from './predictions.module';

const tomorrow = () => new Date(Date.now() + 86_400_000);

describe('PredictionsController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiPredictionsControllerModule]);
  });
  afterAll(() => app.close());
  // The caller every app.call() sends.
  let user: TestUser;
  beforeEach(async () => {
    await app.clearDatabase();
    user = await app.signIn();
  });

  const predictions = () => app.get(PredictionDalService);

  // A game between two new teams, scheduled for tomorrow unless `overrides` say otherwise.
  const createGame = async (
    overrides: Parameters<TestApp['createGame']>[2] = {},
  ) => {
    const home = await app.createTeam();
    const away = await app.createTeam();
    return app.createGame(home.id, away.id, {
      startTime: tomorrow(),
      ...overrides,
    });
  };

  describe('PUT /predictions/:gameId', () => {
    const put = (gameId: string, body: unknown, token?: string | null) =>
      app.call('PUT', `/predictions/${gameId}`, body, token);

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const game = await createGame();
        const { status } = await put(
          game.id,
          { pick: PredictionPick.HOME },
          null,
        );
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('requires a pick', async () => {
        const game = await createGame();
        const { status, body } = await put(game.id, {});
        expect(status).toBe(400);
        expect(body.message).toContain('pick is required');
      });

      it('takes only Home, Away or null', async () => {
        const game = await createGame();
        const { status, body } = await put(game.id, { pick: 'Draw' });
        expect(status).toBe(400);
        expect(body.message).toContain(
          'pick must be one of Home, Away or null',
        );
      });
    });

    describe('behavior', () => {
      it('records the pick of a game that has not begun', async () => {
        const game = await createGame();

        const { status, body } = await put(game.id, {
          pick: PredictionPick.AWAY,
        });

        expect(status).toBe(200);
        expect(body.data).toEqual({ gameId: game.id, pick: 'Away' });
        expect(await predictions().findBySeason(user.id, 2026)).toMatchObject([
          { userId: user.id, gameId: game.id, pick: PredictionPick.AWAY },
        ]);
      });

      it('replaces the pick, and takes it back with null: one row per user and game', async () => {
        const game = await createGame();
        await put(game.id, { pick: PredictionPick.AWAY });
        await put(game.id, { pick: PredictionPick.HOME });

        const { body } = await put(game.id, { pick: null });

        expect(body.data).toEqual({ gameId: game.id, pick: null });
        expect(await predictions().findBySeason(user.id, 2026)).toMatchObject([
          { gameId: game.id, pick: null },
        ]);
      });

      it("keeps each user's pick apart", async () => {
        const game = await createGame();
        const other = await app.createUser();
        await put(game.id, { pick: PredictionPick.HOME }, other.token);

        await put(game.id, { pick: PredictionPick.AWAY });

        expect(await predictions().findBySeason(other.id, 2026)).toMatchObject([
          { pick: PredictionPick.HOME },
        ]);
      });

      it('is 404 for a game that does not exist', async () => {
        const { status } = await put('nba-20261111-nope', {
          pick: PredictionPick.HOME,
        });
        expect(status).toBe(404);
      });

      it.each([
        ['has started (its start time passed)', { startTime: new Date() }],
        [
          'is in progress',
          { status: GameStatus.IN_PROGRESS, homeScore: 50, awayScore: 48 },
        ],
        [
          'is final',
          {
            startTime: new Date('2026-11-01T23:00:00Z'),
            status: GameStatus.FINAL,
          },
        ],
      ])(
        'refuses a game that %s: 409 PREDICTION_LOCKED, nothing written',
        async (_, overrides) => {
          const game = await createGame(overrides);

          const { status, body } = await put(game.id, {
            pick: PredictionPick.HOME,
          });

          expect(status).toBe(409);
          expect(body.code).toBe(ErrorCode.PREDICTION_LOCKED);
          expect(await predictions().findBySeason(user.id, 2026)).toEqual([]);
        },
      );

      it('refuses a game more than 10 days away: 409 PREDICTION_NOT_OPEN, nothing written', async () => {
        const game = await createGame({
          startTime: new Date(Date.now() + 11 * 86_400_000),
        });

        const { status, body } = await put(game.id, {
          pick: PredictionPick.HOME,
        });

        expect(status).toBe(409);
        expect(body.code).toBe(ErrorCode.PREDICTION_NOT_OPEN);
        expect(await predictions().findBySeason(user.id, 2026)).toEqual([]);
      });
    });
  });

  describe('GET /predictions', () => {
    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { status } = await app.call(
          'GET',
          '/predictions?season=2026',
          undefined,
          null,
        );
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('requires a season, as a year', async () => {
        const missing = await app.call('GET', '/predictions');
        const bad = await app.call('GET', '/predictions?season=soon');
        expect(missing.status).toBe(400);
        expect(missing.body.message).toContain('season is a required field');
        expect(bad.status).toBe(400);
        expect(bad.body.message).toContain('season must be a year');
      });
    });

    describe('behavior', () => {
      it("answers the caller's predictions of the season's games only", async () => {
        const other = await app.createUser();
        const game = await createGame();
        const lastSeason = await createGame({ season: 2025 });
        await predictions().set({
          userId: user.id,
          gameId: game.id,
          pick: PredictionPick.HOME,
        });
        await predictions().set({
          userId: user.id,
          gameId: lastSeason.id,
          pick: PredictionPick.AWAY,
        });
        await predictions().set({
          userId: other.id,
          gameId: game.id,
          pick: PredictionPick.AWAY,
        });

        const { status, body } = await app.call(
          'GET',
          '/predictions?season=2026',
        );

        expect(status).toBe(200);
        expect(body.data).toEqual([{ gameId: game.id, pick: 'Home' }]);
      });
    });
  });
});
