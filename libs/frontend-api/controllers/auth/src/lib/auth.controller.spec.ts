import { ErrorCode } from '@nba/enums';
import { TestApp, TestIdentity } from '@nba/frontend-api-test-utils';
import { UserDalService } from '@nba/sql-users';
import { FrontendApiAuthControllerModule } from './auth.module';

// Dana's Firebase account.
const DANA: TestIdentity = { uid: 'firebase-dana', email: 'dana@nba.dev' };

describe('AuthController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiAuthControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(() => app.clearDatabase());

  const users = () => app.get(UserDalService);

  describe('POST /sign-up', () => {
    const signUp = (body: Record<string, unknown>, token?: string) =>
      app.call('POST', '/sign-up', body, token);

    const validBody = (identity: TestIdentity = DANA) => ({
      idToken: app.identityToken(identity),
      name: 'Dana Levi',
    });

    describe('validation', () => {
      const expectRejected = async (
        overrides: Record<string, unknown>,
        message: string,
      ) => {
        const { status, body } = await signUp({ ...validBody(), ...overrides });
        expect(status).toBe(400);
        expect(body.message).toContain(message);
      };

      it('rejects a missing ID token', () =>
        expectRejected({ idToken: undefined }, 'idToken is a required field'));

      it('rejects an ID token longer than 4096 characters', () =>
        expectRejected(
          { idToken: 't'.repeat(4097) },
          'idToken must be at most 4096 characters',
        ));

      it('rejects a missing name', () =>
        expectRejected({ name: undefined }, 'name is a required field'));

      it('rejects a blank name', () =>
        expectRejected({ name: '   ' }, 'name is a required field'));

      it('rejects a name longer than 255 characters', () =>
        expectRejected(
          { name: 'n'.repeat(256) },
          'name must be at most 255 characters',
        ));
    });

    describe('auth', () => {
      it('needs no Authorization header, and ignores a bad one', async () => {
        expect((await signUp(validBody(), 'garbage')).status).toBe(201);
      });

      it('refuses a token Firebase refuses', async () => {
        const { status } = await signUp({ ...validBody(), idToken: 'forged' });
        expect(status).toBe(401);
      });

      it('refuses an account whose email is not verified yet, and makes no user', async () => {
        const { status, body } = await signUp(
          validBody({ ...DANA, emailVerified: false }),
        );

        expect(status).toBe(403);
        expect(body.code).toBe(ErrorCode.EMAIL_NOT_VERIFIED);
        await expect(users().findByEmail(DANA.email)).resolves.toBeNull();
      });
    });

    describe('behavior', () => {
      it("makes a user of the account: the name, the account's email (lower-cased) and its uid", async () => {
        const { status, body } = await signUp(
          validBody({ ...DANA, email: ' Dana@NBA.dev' }),
        );

        expect(status).toBe(201);
        expect(body.data).toEqual({ userId: expect.any(String) });
        await expect(users().findById(body.data.userId)).resolves.toMatchObject(
          { name: 'Dana Levi', email: DANA.email, firebaseUid: DANA.uid },
        );
      });

      it('answers the user already linked to the account, as they are', async () => {
        const first = await signUp(validBody());

        const again = await signUp({ ...validBody(), name: 'Another Name' });

        expect(again.status).toBe(201);
        expect(again.body.data.userId).toBe(first.body.data.userId);
        await expect(
          users().findById(first.body.data.userId),
        ).resolves.toMatchObject({ name: 'Dana Levi' });
      });

      it('answers 409 USER_EXISTS for an email whose user is linked to another account, and changes nothing', async () => {
        const linked = await app.createUser({
          name: 'First Dana',
          email: DANA.email,
          firebaseUid: 'firebase-another-account',
        });

        const { status, body } = await signUp(validBody());

        expect(status).toBe(409);
        expect(body.code).toBe(ErrorCode.USER_EXISTS);
        await expect(users().findById(linked.id)).resolves.toMatchObject({
          name: 'First Dana',
          firebaseUid: 'firebase-another-account',
        });
      });

      it('ignores fields it does not know', async () => {
        const id = 'a5a1fa7f-63bb-4a86-a2a2-3c3a3e9c6f1d';
        const { body } = await signUp({
          ...validBody(),
          id,
          firebaseUid: 'firebase-chosen',
        });

        expect(body.data.userId).not.toBe(id);
        await expect(users().findById(body.data.userId)).resolves.toMatchObject(
          { firebaseUid: DANA.uid },
        );
      });
    });
  });

  describe('POST /login', () => {
    const login = (identity: TestIdentity = DANA) =>
      app.call('POST', '/login', { idToken: app.identityToken(identity) });

    describe('validation', () => {
      it('rejects a missing ID token', async () => {
        const { status, body } = await app.call('POST', '/login', {});
        expect(status).toBe(400);
        expect(body.message).toContain('idToken is a required field');
      });

      it('rejects an ID token longer than 4096 characters', async () => {
        const { status, body } = await app.call('POST', '/login', {
          idToken: 't'.repeat(4097),
        });
        expect(status).toBe(400);
        expect(body.message).toContain(
          'idToken must be at most 4096 characters',
        );
      });
    });

    describe('auth', () => {
      it('refuses a token Firebase refuses', async () => {
        await app.createUser({ email: DANA.email, firebaseUid: DANA.uid });
        const { status } = await app.call('POST', '/login', {
          idToken: 'forged',
        });
        expect(status).toBe(401);
      });

      it('refuses an account whose email is not verified yet', async () => {
        await app.createUser({ email: DANA.email, firebaseUid: DANA.uid });

        const { status, body } = await login({ ...DANA, emailVerified: false });

        expect(status).toBe(403);
        expect(body.code).toBe(ErrorCode.EMAIL_NOT_VERIFIED);
      });
    });

    describe('behavior', () => {
      it('answers the user linked to the account', async () => {
        const dana = await app.createUser({
          email: DANA.email,
          firebaseUid: DANA.uid,
        });

        const { status, body } = await login();

        expect(status).toBe(200);
        expect(body.data).toEqual({ userId: dana.id });
      });

      it('answers 404 for an account no user has yet (its sign-up never finished), and makes none', async () => {
        const { status } = await login();

        expect(status).toBe(404);
        await expect(users().findByEmail(DANA.email)).resolves.toBeNull();
      });

      it("moves the user's email to the account's, changed through Firebase", async () => {
        const dana = await app.createUser({
          email: 'dana.old@nba.dev',
          firebaseUid: DANA.uid,
        });

        expect((await login()).body.data).toEqual({ userId: dana.id });

        await expect(users().findById(dana.id)).resolves.toMatchObject({
          email: DANA.email,
        });
      });

      it("keeps the old email when another user has the account's new one", async () => {
        const dana = await app.createUser({
          email: 'dana.old@nba.dev',
          firebaseUid: DANA.uid,
        });
        await app.createUser({ email: DANA.email });

        expect((await login()).body.data).toEqual({ userId: dana.id });

        await expect(users().findById(dana.id)).resolves.toMatchObject({
          email: 'dana.old@nba.dev',
        });
      });
    });
  });

  describe('GET /me', () => {
    // validation: it reads nothing but the token.

    describe('auth', () => {
      it('refuses a call without a bearer token', async () => {
        const { status } = await app.call('GET', '/me');
        expect(status).toBe(401);
      });

      it('refuses a token Firebase refuses', async () => {
        const { status } = await app.call('GET', '/me', undefined, 'forged');
        expect(status).toBe(401);
      });

      it('refuses an account no user has (its sign-up never finished)', async () => {
        const { status } = await app.call(
          'GET',
          '/me',
          undefined,
          app.identityToken(DANA),
        );
        expect(status).toBe(401);
      });

      it('refuses an account whose email is not verified yet', async () => {
        await app.createUser({ email: DANA.email, firebaseUid: DANA.uid });

        const { status, body } = await app.call(
          'GET',
          '/me',
          undefined,
          app.identityToken({ ...DANA, emailVerified: false }),
        );

        expect(status).toBe(403);
        expect(body.code).toBe(ErrorCode.EMAIL_NOT_VERIFIED);
      });
    });

    describe('behavior', () => {
      it("answers the caller's user", async () => {
        const dana = await app.createUser({ name: 'Dana Levi' });

        const { status, body } = await app.call(
          'GET',
          '/me',
          undefined,
          dana.token,
        );

        expect(status).toBe(200);
        expect(body.data).toEqual({
          id: dana.id,
          name: 'Dana Levi',
          email: dana.email,
        });
      });
    });
  });

  describe('PATCH /me', () => {
    const rename = (body: Record<string, unknown>, token?: string | null) =>
      app.call('PATCH', '/me', body, token);

    describe('validation', () => {
      beforeEach(() => app.signIn());

      const expectRejected = async (
        body: Record<string, unknown>,
        message: string,
      ) => {
        const { status, body: response } = await rename(body);
        expect(status).toBe(400);
        expect(response.message).toContain(message);
      };

      it('rejects a missing name', () =>
        expectRejected({}, 'name is a required field'));

      it('rejects a blank name', () =>
        expectRejected({ name: '   ' }, 'name is a required field'));

      it('rejects a name longer than 255 characters', () =>
        expectRejected(
          { name: 'n'.repeat(256) },
          'name must be at most 255 characters',
        ));
    });

    describe('auth', () => {
      it('refuses a caller who is not signed in', async () => {
        const { status } = await rename({ name: 'Dana Cohen' }, null);
        expect(status).toBe(401);
      });
    });

    describe('behavior', () => {
      it('renames the caller (trimmed), and only them, and answers their user', async () => {
        const dana = await app.signIn({ name: 'Dana Levi' });
        const noa = await app.createUser({ name: 'Noa' });

        const { status, body } = await rename({
          name: ' Dana Cohen ',
          email: 'other@nba.dev',
        });

        expect(status).toBe(200);
        expect(body.data).toEqual({
          id: dana.id,
          name: 'Dana Cohen',
          email: dana.email,
        });
        await expect(users().findById(dana.id)).resolves.toMatchObject({
          name: 'Dana Cohen',
          email: dana.email,
        });
        await expect(users().findById(noa.id)).resolves.toMatchObject({
          name: 'Noa',
        });
      });
    });
  });

  describe('GET /firebase-config', () => {
    // validation: it reads nothing. auth: none, it's read before anyone signs in.

    // The env as a developer's .env may set it, put back after each test.
    const env = { ...process.env };
    beforeEach(() => {
      delete process.env['GOOGLE_CLOUD_PROJECT'];
      delete process.env['FIREBASE_AUTH_DOMAIN'];
      process.env['FIREBASE_API_KEY'] = 'dev-key';
    });
    afterEach(() => {
      process.env = { ...env };
    });

    it("answers what the web needs to reach the dev project, with the env's key", async () => {
      const { status, body } = await app.call('GET', '/firebase-config');

      expect(status).toBe(200);
      expect(body.data).toEqual({
        apiKey: 'dev-key',
        authDomain: 'yuval-nba-test-882ca.firebaseapp.com',
      });
    });
  });
});
