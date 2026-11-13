import { TestApp, TestUser } from '@nba/frontend-api-test-utils';
import { ErrorCode } from '@nba/enums';
import { GameStatus } from '@nba/sql-games';
import { GroupGameScoreDalService } from '@nba/sql-group-game-score';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-score';
import { GroupDalService, GroupStatus } from '@nba/sql-groups';
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
  // A group the caller owns, and one Omer owns that the caller may see.
  const mineAndOmers = async () => {
    const omer = await app.createUser({ name: 'Omer Cohen' });
    const mine = await members().createGroup({
      name: 'Friday League',
      ownerId: user.id,
      public: false,
    });
    const omers = await members().createGroup({
      name: 'Open Court',
      ownerId: omer.id,
      public: true,
    });
    return { omer, mine, omers };
  };

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
          gameScores: [],
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

  describe('PATCH /groups/:id', () => {
    const patch = (id: string, body: unknown, token?: string | null) =>
      app.call('PATCH', `/groups/${id}`, body, token);

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { mine } = await mineAndOmers();
        const { status } = await patch(
          mine.id,
          { name: 'Friday', public: true },
          null,
        );
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('takes only a uuid', async () => {
        const { status, body } = await patch('nope', {
          name: 'Friday',
          public: true,
        });
        expect(status).toBe(400);
        expect(body.message).toContain('id must be a uuid');
      });

      it('requires a name', async () => {
        const { mine } = await mineAndOmers();
        const { status, body } = await patch(mine.id, { public: true });
        expect(status).toBe(400);
        expect(body.message).toContain('name is required');
      });

      it('takes a name of up to 100 characters', async () => {
        const { mine } = await mineAndOmers();
        const { status, body } = await patch(mine.id, {
          name: 'x'.repeat(101),
          public: true,
        });
        expect(status).toBe(400);
        expect(body.message).toContain('name must be at most 100 characters');
      });

      it('requires public', async () => {
        const { mine } = await mineAndOmers();
        const { status, body } = await patch(mine.id, { name: 'Friday' });
        expect(status).toBe(400);
        expect(body.message).toContain('public is required');
      });

      it('takes only true or false for public', async () => {
        const { mine } = await mineAndOmers();
        const { status, body } = await patch(mine.id, {
          name: 'Friday',
          public: 'no',
        });
        expect(status).toBe(400);
        expect(body.message).toContain('public must be true or false');
      });
    });

    describe('behavior', () => {
      it("renames the caller's group and makes it public", async () => {
        const { mine } = await mineAndOmers();

        const { status, body } = await patch(mine.id, {
          name: ' Sunday Hoops ',
          public: true,
        });

        expect(status).toBe(200);
        expect(body.data).toEqual({
          id: mine.id,
          name: 'Sunday Hoops',
          public: true,
          status: GroupStatus.ACTIVE,
          owner: { id: user.id, name: 'Dana Levi' },
          memberCount: 1,
          isMember: true,
        });
        expect(await app.get(GroupDalService).findById(mine.id)).toMatchObject({
          name: 'Sunday Hoops',
          public: true,
        });
      });

      it("is 403 for a group the caller sees but doesn't own, and changes nothing", async () => {
        const { omers } = await mineAndOmers();

        const { status } = await patch(omers.id, {
          name: 'Mine now',
          public: false,
        });

        expect(status).toBe(403);
        expect(await app.get(GroupDalService).findById(omers.id)).toMatchObject(
          { name: 'Open Court', public: true },
        );
      });

      it("is 404 for a private group the caller isn't in", async () => {
        const { omer } = await mineAndOmers();
        const secret = await members().createGroup({
          name: "Omer's Secret",
          ownerId: omer.id,
          public: false,
        });

        const { status } = await patch(secret.id, {
          name: 'Found',
          public: true,
        });
        expect(status).toBe(404);
      });

      it('is 404 for a deleted group', async () => {
        const { mine } = await mineAndOmers();
        await app.get(GroupDalService).delete(mine.id);

        const { status } = await patch(mine.id, {
          name: 'Back',
          public: true,
        });
        expect(status).toBe(404);
      });
    });
  });

  describe('DELETE /groups/:id', () => {
    const del = (id: string, token?: string | null) =>
      app.call('DELETE', `/groups/${id}`, undefined, token);
    const row = async (id: string) => {
      const [found] = await app
        .get(DataSource)
        .query('SELECT status, deleted_at FROM groups WHERE id = $1', [id]);
      return found;
    };

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { mine } = await mineAndOmers();
        const { status } = await del(mine.id, null);
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('takes only a uuid', async () => {
        const { status, body } = await del('nope');
        expect(status).toBe(400);
        expect(body.message).toContain('id must be a uuid');
      });
    });

    describe('behavior', () => {
      it("soft-deletes the caller's group, which no read answers again", async () => {
        const { mine, omers } = await mineAndOmers();

        const { status } = await del(mine.id);

        expect(status).toBe(204);
        expect(await row(mine.id)).toEqual({
          status: GroupStatus.DELETED,
          deleted_at: expect.any(Date),
        });
        const list = await app.call('GET', '/groups');
        expect(list.body.data.map((group: { id: string }) => group.id)).toEqual(
          [omers.id],
        );
        expect((await app.call('GET', `/groups/${mine.id}`)).status).toBe(404);
        expect((await del(mine.id)).status).toBe(404);
      });

      it("is 403 for a group the caller sees but doesn't own, and keeps it", async () => {
        const { omers } = await mineAndOmers();

        const { status } = await del(omers.id);

        expect(status).toBe(403);
        expect(await row(omers.id)).toEqual({
          status: GroupStatus.ACTIVE,
          deleted_at: null,
        });
      });

      it('is 404 for a group that does not exist', async () => {
        const { status } = await del('00000000-0000-4000-8000-000000000000');
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

  describe('PUT /groups/:id/games/:gameId/score', () => {
    const put = (
      id: string,
      gameId: string,
      body: unknown,
      token?: string | null,
    ) => app.call('PUT', `/groups/${id}/games/${gameId}/score`, body, token);
    const scheduled = async (overrides = {}) => {
      const home = await app.createTeam();
      const away = await app.createTeam();
      return app.createGame(home.id, away.id, {
        startTime: new Date(Date.now() + 86_400_000),
        status: GameStatus.SCHEDULED,
        ...overrides,
      });
    };

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { mine } = await mineAndOmers();
        const { status } = await put(mine.id, 'nba-g1', { score: 2 }, null);
        expect(status).toBe(401);
      });
    });

    describe('validation', () => {
      it('takes only a uuid for the group', async () => {
        const { status, body } = await put('nope', 'nba-g1', { score: 2 });
        expect(status).toBe(400);
        expect(body.message).toContain('id must be a uuid');
      });

      it('requires a score', async () => {
        const { mine } = await mineAndOmers();
        const { status, body } = await put(mine.id, 'nba-g1', {});
        expect(status).toBe(400);
        expect(body.message).toContain('score is required');
      });

      it('takes only a number', async () => {
        const { mine } = await mineAndOmers();
        const { status, body } = await put(mine.id, 'nba-g1', { score: 'x' });
        expect(status).toBe(400);
        expect(body.message).toContain('score must be a number');
      });

      it('takes only an integer', async () => {
        const { mine } = await mineAndOmers();
        const { status, body } = await put(mine.id, 'nba-g1', { score: 1.5 });
        expect(status).toBe(400);
        expect(body.message).toContain('score must be an integer');
      });

      it('takes 0 to 100', async () => {
        const { mine } = await mineAndOmers();
        const low = await put(mine.id, 'nba-g1', { score: -1 });
        expect(low.body.message).toContain('score must be at least 0');
        const high = await put(mine.id, 'nba-g1', { score: 101 });
        expect(high.body.message).toContain('score must be at most 100');
      });
    });

    describe('behavior', () => {
      it("sets, then changes, a game's score in the caller's group, which the group answers", async () => {
        const { mine } = await mineAndOmers();
        const game = await scheduled();

        const created = await put(mine.id, game.id, { score: 3 });
        const { status, body } = await put(mine.id, game.id, { score: 2 });

        expect(created.status).toBe(200);
        expect(status).toBe(200);
        expect(body.data).toEqual({ gameId: game.id, score: 2 });
        expect(
          await app.get(GroupGameScoreDalService).findByGame(game.id),
        ).toEqual(new Map([[mine.id, 2]]));
        const group = await app.call('GET', `/groups/${mine.id}`);
        expect(group.body.data.gameScores).toEqual([
          { gameId: game.id, score: 2 },
        ]);
      });

      it('sets a game that has begun but is not final', async () => {
        const { mine } = await mineAndOmers();
        const game = await scheduled({
          startTime: new Date(Date.now() - 3_600_000),
          status: GameStatus.IN_PROGRESS,
        });
        const { status } = await put(mine.id, game.id, { score: 2 });
        expect(status).toBe(200);
      });

      it('is 409 GAME_COMPLETED for a final or canceled game, and sets nothing', async () => {
        const { mine } = await mineAndOmers();
        for (const status of [GameStatus.FINAL, GameStatus.CANCELED]) {
          const game = await scheduled({
            startTime: new Date('2026-11-11T23:00:00Z'),
            status,
          });
          const { status: code, body } = await put(mine.id, game.id, {
            score: 2,
          });
          expect(code).toBe(409);
          expect(body.code).toBe(ErrorCode.GAME_COMPLETED);
        }
        expect(
          await app.get(GroupGameScoreDalService).findByGroup(mine.id),
        ).toEqual([]);
      });

      it("is 403 for a group the caller sees but doesn't own", async () => {
        const { omers } = await mineAndOmers();
        const game = await scheduled();
        const { status } = await put(omers.id, game.id, { score: 2 });
        expect(status).toBe(403);
      });

      it("is 404 for a private group the caller isn't in", async () => {
        const { mine } = await mineAndOmers();
        const game = await scheduled();
        const stranger = await app.createUser({ name: 'Stranger' });
        const { status } = await put(
          mine.id,
          game.id,
          { score: 2 },
          stranger.token,
        );
        expect(status).toBe(404);
      });

      it('is 404 for a game that does not exist', async () => {
        const { mine } = await mineAndOmers();
        const { status } = await put(mine.id, 'nba-nope', { score: 2 });
        expect(status).toBe(404);
      });
    });
  });
});
