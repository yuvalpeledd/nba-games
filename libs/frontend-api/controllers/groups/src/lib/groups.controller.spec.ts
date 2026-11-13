import { TestApp, TestUser } from '@nba/frontend-api-test-utils';
import { GameStatus } from '@nba/sql-games';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-score';
import { GroupStatus } from '@nba/sql-groups';
import { PredictionDalService, PredictionPick } from '@nba/sql-predictions';
import { DataSource } from 'typeorm';
import { FrontendApiGroupsControllerModule } from './groups.module';

describe('GroupsController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiGroupsControllerModule]);
  });
  afterAll(() => app.close());
  // The caller every app.call() sends.
  let user: TestUser;
  beforeEach(async () => {
    await app.clearDatabase();
    user = await app.signIn({ name: 'Dana Levi' });
  });

  const members = () => app.get(GroupMemberDalService);
  // ponytail: joining has no DAL yet; the specs insert memberships themselves.
  const join = (groupId: string, userId: string) =>
    app
      .get(DataSource)
      .query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [
        groupId,
        userId,
      ]);

  describe('POST /groups', () => {
    const post = (body: unknown, token?: string | null) =>
      app.call('POST', '/groups', body, token);

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { status } = await post({ name: 'Friday', public: true }, null);
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('requires a name', async () => {
        const { status, body } = await post({ name: '  ', public: true });
        expect(status).toBe(400);
        expect(body.message).toContain('name is required');
      });

      it('takes a name of up to 100 characters', async () => {
        const { status, body } = await post({
          name: 'x'.repeat(101),
          public: true,
        });
        expect(status).toBe(400);
        expect(body.message).toContain('name must be at most 100 characters');
      });

      it('requires public', async () => {
        const { status, body } = await post({ name: 'Friday' });
        expect(status).toBe(400);
        expect(body.message).toContain('public is required');
      });

      it('takes only true or false for public', async () => {
        const { status, body } = await post({ name: 'Friday', public: 'no' });
        expect(status).toBe(400);
        expect(body.message).toContain('public must be true or false');
      });
    });

    describe('behavior', () => {
      it('makes an active group the caller owns and is the only member of', async () => {
        const { status, body } = await post({
          name: ' Friday League ',
          public: false,
        });

        expect(status).toBe(201);
        expect(body.data).toEqual({
          id: expect.any(String),
          name: 'Friday League',
          public: false,
          status: GroupStatus.ACTIVE,
          owner: { id: user.id, name: 'Dana Levi' },
          memberCount: 1,
          isMember: true,
        });
        expect(await members().findVisibleTo(user.id)).toMatchObject([
          {
            group: { id: body.data.id, ownerId: user.id },
            memberCount: 1,
            isMember: true,
          },
        ]);
      });
    });
  });

  describe('GET /groups', () => {
    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { status } = await app.call('GET', '/groups', undefined, null);
        expect(status).toBe(401);
      });
    });

    describe('behavior', () => {
      it("answers every public group and the caller's private ones, by name", async () => {
        const omer = await app.createUser({ name: 'Omer Cohen' });
        await members().createGroup({
          name: 'Open Court',
          ownerId: omer.id,
          public: true,
        });
        await members().createGroup({
          name: "Omer's Secret",
          ownerId: omer.id,
          public: false,
        });
        await members().createGroup({
          name: 'Friday League',
          ownerId: user.id,
          public: false,
        });

        const { status, body } = await app.call('GET', '/groups');

        expect(status).toBe(200);
        expect(body.data).toEqual([
          {
            id: expect.any(String),
            name: 'Friday League',
            public: false,
            status: GroupStatus.ACTIVE,
            owner: { id: user.id, name: 'Dana Levi' },
            memberCount: 1,
            isMember: true,
          },
          {
            id: expect.any(String),
            name: 'Open Court',
            public: true,
            status: GroupStatus.ACTIVE,
            owner: { id: omer.id, name: 'Omer Cohen' },
            memberCount: 1,
            isMember: false,
          },
        ]);
      });
    });
  });

  describe('GET /groups/:id', () => {
    const get = (id: string, token?: string | null) =>
      app.call('GET', `/groups/${id}`, undefined, token);

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const group = await members().createGroup({
          name: 'Open Court',
          ownerId: user.id,
          public: true,
        });
        const { status } = await get(group.id, null);
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('takes only a uuid', async () => {
        const { status, body } = await get('nope');
        expect(status).toBe(400);
        expect(body.message).toContain('id must be a uuid');
      });
    });

    describe('behavior', () => {
      it('answers a public group the caller is not in, with its members by name', async () => {
        const omer = await app.createUser({ name: 'Omer Cohen' });
        const group = await members().createGroup({
          name: 'Open Court',
          ownerId: omer.id,
          public: true,
        });

        const { status, body } = await get(group.id);

        expect(status).toBe(200);
        expect(body.data).toEqual({
          id: group.id,
          name: 'Open Court',
          public: true,
          status: GroupStatus.ACTIVE,
          owner: { id: omer.id, name: 'Omer Cohen' },
          memberCount: 1,
          isMember: false,
          members: [{ id: omer.id, name: 'Omer Cohen', score: 0 }],
        });
      });

      it("answers the caller's private group", async () => {
        const group = await members().createGroup({
          name: 'Friday League',
          ownerId: user.id,
          public: false,
        });

        const { status, body } = await get(group.id);

        expect(status).toBe(200);
        expect(body.data).toMatchObject({
          name: 'Friday League',
          isMember: true,
          members: [{ id: user.id, name: 'Dana Levi', score: 0 }],
        });
      });

      it("answers each member's score in it, from every game scored there", async () => {
        const omer = await app.createUser({ name: 'Omer Cohen' });
        const group = await members().createGroup({
          name: 'Friday League',
          ownerId: user.id,
          public: false,
        });
        const office = await members().createGroup({
          name: 'Office',
          ownerId: user.id,
          public: false,
        });
        await join(group.id, omer.id);
        const home = await app.createTeam();
        const away = await app.createTeam();
        const [first, second] = await Promise.all([
          app.createGame(home.id, away.id, { id: 'nba-g1' }),
          app.createGame(home.id, away.id, { id: 'nba-g2' }),
        ]);
        await app.get(GroupUserScoreDalService).upsert([
          { groupId: group.id, userId: user.id, gameId: first.id, score: 1 },
          { groupId: group.id, userId: user.id, gameId: second.id, score: 1 },
          { groupId: group.id, userId: omer.id, gameId: first.id, score: 0 },
          // Another group's doesn't count here.
          { groupId: office.id, userId: omer.id, gameId: second.id, score: 1 },
        ]);

        const { body } = await get(group.id);

        expect(body.data.members).toEqual([
          { id: user.id, name: 'Dana Levi', score: 2 },
          { id: omer.id, name: 'Omer Cohen', score: 0 },
        ]);
      });

      it("is 404 for a private group the caller isn't in", async () => {
        const omer = await app.createUser({ name: 'Omer Cohen' });
        const group = await members().createGroup({
          name: "Omer's Secret",
          ownerId: omer.id,
          public: false,
        });

        const { status } = await get(group.id);
        expect(status).toBe(404);
      });

      it('is 404 for a group that does not exist', async () => {
        const { status } = await get('00000000-0000-4000-8000-000000000000');
        expect(status).toBe(404);
      });
    });
  });

  describe('GET /groups/:id/games/:gameId/predictions', () => {
    const get = (id: string, gameId: string, token?: string | null) =>
      app.call(
        'GET',
        `/groups/${id}/games/${gameId}/predictions`,
        undefined,
        token,
      );
    let groupId: string;
    let omer: TestUser;
    let noam: TestUser;
    const game = async (overrides: { startTime: Date; status: GameStatus }) => {
      const home = await app.createTeam();
      const away = await app.createTeam();
      const created = await app.createGame(home.id, away.id, overrides);
      const predictions = app.get(PredictionDalService);
      await predictions.set({
        userId: user.id,
        gameId: created.id,
        pick: PredictionPick.HOME,
      });
      await predictions.set({
        userId: omer.id,
        gameId: created.id,
        pick: PredictionPick.AWAY,
      });
      // Noam took theirs back: no pick.
      await predictions.set({
        userId: noam.id,
        gameId: created.id,
        pick: null,
      });
      return created;
    };

    beforeEach(async () => {
      omer = await app.createUser({ name: 'Omer Cohen' });
      noam = await app.createUser({ name: 'Noam Bar' });
      ({ id: groupId } = await members().createGroup({
        name: 'Friday League',
        ownerId: user.id,
        public: false,
      }));
      await join(groupId, omer.id);
      await join(groupId, noam.id);
    });

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { status } = await get(groupId, 'nba-g1', null);
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('takes only a uuid for the group', async () => {
        const { status, body } = await get('nope', 'nba-g1');
        expect(status).toBe(400);
        expect(body.message).toContain('id must be a uuid');
      });
    });

    describe('behavior', () => {
      it("answers every member's pick once the game has begun", async () => {
        const { id } = await game({
          startTime: new Date('2026-11-11T23:00:00Z'),
          status: GameStatus.FINAL,
        });

        const { status, body } = await get(groupId, id);

        expect(status).toBe(200);
        expect(body.data).toEqual([
          { id: user.id, name: 'Dana Levi', picked: true, pick: 'Home' },
          { id: noam.id, name: 'Noam Bar', picked: false, pick: null },
          { id: omer.id, name: 'Omer Cohen', picked: true, pick: 'Away' },
        ]);
      });

      it('answers only who picked until the game begins', async () => {
        const { id } = await game({
          startTime: new Date(Date.now() + 86_400_000),
          status: GameStatus.SCHEDULED,
        });

        const { body } = await get(groupId, id);

        expect(body.data).toEqual([
          { id: user.id, name: 'Dana Levi', picked: true, pick: null },
          { id: noam.id, name: 'Noam Bar', picked: false, pick: null },
          { id: omer.id, name: 'Omer Cohen', picked: true, pick: null },
        ]);
      });

      it('is 404 for a game that does not exist', async () => {
        const { status } = await get(groupId, 'nba-nope');
        expect(status).toBe(404);
      });

      it("is 404 for a private group the caller isn't in", async () => {
        const { id } = await game({
          startTime: new Date('2026-11-11T23:00:00Z'),
          status: GameStatus.FINAL,
        });
        const stranger = await app.createUser({ name: 'Stranger' });
        const { status } = await get(groupId, id, stranger.token);
        expect(status).toBe(404);
      });
    });
  });
});
