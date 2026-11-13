import { TestApp, TestUser } from '@nba/frontend-api-test-utils';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupDalService, GroupStatus } from '@nba/sql-groups';
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
          members: [{ id: omer.id, name: 'Omer Cohen' }],
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
          members: [{ id: user.id, name: 'Dana Levi' }],
        });
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
});
