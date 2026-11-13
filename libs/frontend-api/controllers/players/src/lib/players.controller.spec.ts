import { TestApp } from '@nba/frontend-api-test-utils';
import { FrontendApiPlayersControllerModule } from './players.module';

describe('PlayersController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiPlayersControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(() => app.clearDatabase());

  describe('GET /players', () => {
    describe('validation', () => {
      it.each([
        ['limit=0', 'limit must be greater than or equal to 1'],
        ['limit=101', 'limit must be less than or equal to 100'],
        ['limit=1.5', 'limit must be an integer'],
        ['limit=many', expect.stringMatching(/^limit must be a `number` type/)],
        ['offset=-1', 'offset must be greater than or equal to 0'],
        [`teamId=${'x'.repeat(101)}`, 'teamId must be at most 100 characters'],
      ])('refuses %s', async (query, message) => {
        const { status, body } = await app.call('GET', `/players?${query}`);

        expect(status).toBe(400);
        expect(body.message).toEqual([message]);
      });
    });

    describe('behavior', () => {
      it('lists players by last then first name, 50 at a time by default', async () => {
        const team = await app.createTeam();
        const smith = await app.createPlayer(team.id, {
          lastName: 'Smith',
          firstName: 'Al',
        });
        const brown = await app.createPlayer(null, {
          lastName: 'Brown',
          firstName: 'Zed',
        });
        const ann = await app.createPlayer(team.id, {
          lastName: 'Brown',
          firstName: 'Ann',
        });

        const { status, body } = await app.call('GET', '/players');

        expect(status).toBe(200);
        expect(body).toEqual({ data: [ann, brown, smith] });
      });

      it('pages with limit and offset', async () => {
        const players = [];
        for (const lastName of ['A', 'B', 'C', 'D']) {
          players.push(await app.createPlayer(null, { lastName }));
        }

        const { body } = await app.call('GET', '/players?limit=2&offset=1');

        expect(body.data).toEqual(players.slice(1, 3));
      });

      it("lists only a team's players with teamId", async () => {
        const [team, other] = [await app.createTeam(), await app.createTeam()];
        const ours = await app.createPlayer(team.id);
        await app.createPlayer(other.id);
        await app.createPlayer(null);

        const { body } = await app.call('GET', `/players?teamId=${team.id}`);

        expect(body.data).toEqual([ours]);
      });
    });
  });

  describe('GET /players/:id', () => {
    describe('validation', () => {
      it('refuses an id over 100 characters', async () => {
        const { status, body } = await app.call(
          'GET',
          `/players/${'x'.repeat(101)}`,
        );

        expect(status).toBe(400);
        expect(body.message).toEqual(['id must be at most 100 characters']);
      });
    });

    describe('behavior', () => {
      it('answers the player', async () => {
        const player = await app.createPlayer(null);

        expect(await app.call('GET', `/players/${player.id}`)).toEqual({
          status: 200,
          body: { data: player },
        });
      });

      it('answers 404 for an unknown player', async () => {
        const { status, body } = await app.call('GET', '/players/nba-p-x');

        expect(status).toBe(404);
        expect(body.message).toBe('Player nba-p-x not found');
      });
    });
  });

  describe('GET /players/:id/teams', () => {
    describe('behavior', () => {
      it("answers each team's first and last day, a trade's day on both", async () => {
        const [from, to] = [await app.createTeam(), await app.createTeam()];
        const player = await app.createPlayer(to.id);
        await app.addToRoster(from.id, player.id, [
          '2026-11-01',
          '2026-11-02',
          '2026-11-03',
        ]);
        await app.addToRoster(to.id, player.id, ['2026-11-03', '2026-11-04']);

        const { status, body } = await app.call(
          'GET',
          `/players/${player.id}/teams`,
        );

        expect(status).toBe(200);
        expect(body.data).toEqual([
          { teamId: from.id, from: '2026-11-01', to: '2026-11-03' },
          { teamId: to.id, from: '2026-11-03', to: '2026-11-04' },
        ]);
      });

      it('answers an empty list for a player no roster fetch saw', async () => {
        const player = await app.createPlayer(null);

        const { body } = await app.call('GET', `/players/${player.id}/teams`);

        expect(body.data).toEqual([]);
      });

      it('answers 404 for an unknown player', async () => {
        const { status } = await app.call('GET', '/players/nba-p-x/teams');

        expect(status).toBe(404);
      });
    });
  });
});
