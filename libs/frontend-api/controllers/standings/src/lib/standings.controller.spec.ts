import { TestApp } from '@nba/frontend-api-test-utils';
import { FrontendApiStandingsControllerModule } from './standings.module';

describe('StandingsController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiStandingsControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await app.clearDatabase();
    await app.signIn();
  });

  describe('GET /standings', () => {
    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { status } = await app.call('GET', '/standings', undefined, null);
        expect(status).toBe(401);
      });
    });
    describe('validation', () => {
      it.each([
        ['', 'season is a required field'],
        ['season=2026.5', 'season must be an integer'],
        ['season=1900', 'season must be greater than or equal to 1946'],
        ['season=2101', 'season must be less than or equal to 2100'],
      ])('refuses ?%s', async (query, message) => {
        const { status, body } = await app.call('GET', `/standings?${query}`);

        expect(status).toBe(400);
        expect(body.message).toEqual([message]);
      });
    });

    describe('behavior', () => {
      it("answers the season's standings by league rank", async () => {
        const [a, b] = [await app.createTeam(), await app.createTeam()];
        const second = await app.createStanding(2026, a.id, {
          leagueRank: 2,
          streak: 'L1',
        });
        const first = await app.createStanding(2026, b.id, { leagueRank: 1 });
        await app.createStanding(2025, a.id, { final: true });

        const { status, body } = await app.call(
          'GET',
          '/standings?season=2026',
        );

        expect(status).toBe(200);
        expect(body).toEqual({ data: [first, second] });
      });

      it('answers an empty list for a season not fetched', async () => {
        const { body } = await app.call('GET', '/standings?season=2030');

        expect(body.data).toEqual([]);
      });
    });
  });
});
