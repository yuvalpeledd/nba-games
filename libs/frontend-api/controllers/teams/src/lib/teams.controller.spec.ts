import { TestApp } from '@nba/frontend-api-test-utils';
import { FrontendApiTeamsControllerModule } from './teams.module';

describe('TeamsController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiTeamsControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(() => app.clearDatabase());

  describe('GET /teams', () => {
    describe('behavior', () => {
      it('lists every team by name, past franchises included', async () => {
        const nets = await app.createTeam({
          name: 'New Jersey Nets',
          active: false,
        });
        const celtics = await app.createTeam({ name: 'Boston Celtics' });

        const { status, body } = await app.call('GET', '/teams');

        expect(status).toBe(200);
        expect(body).toEqual({ data: [celtics, nets] });
      });

      it('answers an empty list before the first fetch', async () => {
        expect(await app.call('GET', '/teams')).toEqual({
          status: 200,
          body: { data: [] },
        });
      });
    });
  });

  describe('GET /teams/:id', () => {
    describe('validation', () => {
      it('refuses an id over 100 characters', async () => {
        const { status, body } = await app.call(
          'GET',
          `/teams/${'x'.repeat(101)}`,
        );

        expect(status).toBe(400);
        expect(body.message).toEqual(['id must be at most 100 characters']);
      });
    });

    describe('behavior', () => {
      it('answers the team', async () => {
        const team = await app.createTeam();
        await app.createTeam();

        expect(await app.call('GET', `/teams/${team.id}`)).toEqual({
          status: 200,
          body: { data: team },
        });
      });

      it('answers 404 for an unknown team', async () => {
        const { status, body } = await app.call('GET', '/teams/nba-xyz');

        expect(status).toBe(404);
        expect(body.message).toBe('Team nba-xyz not found');
      });
    });
  });
});
