import { fireEvent, screen, within } from '@testing-library/react';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  appWith,
  callsOf,
  Failure,
  type FakeUser,
  fillIn,
  firebase,
  firebaseError,
  stubApi,
} from '@nba/web-test-utils';
import { LoginPage } from './LoginPage';

const { renderAt } = appWith({ LoginPage });

const DANA = { id: 'u1', name: 'Dana Levi', email: 'dana@nba.dev' };

const logIn = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

describe('LoginPage', () => {
  it.each(['/', '/games', '/standings', '/teams/nba-bos'])(
    'sends a signed-out visitor from %s to the login page, full-screen, and asks the API nothing',
    async (path) => {
      const fetchMock = stubApi({});
      renderAt(path, { signedIn: false });

      expect(
        await screen.findByRole('heading', { name: 'Welcome back' }),
      ).toBeTruthy();
      expect(window.location.pathname).toBe('/login');
      expect(screen.queryByRole('navigation')).toBeNull();
      expect(
        fetchMock.mock.calls.filter(([url]) => url !== '/api/firebase-config'),
      ).toEqual([]);
    },
  );

  it('validates the form with the shared schemas before calling Firebase or the API', async () => {
    const fetchMock = stubApi({});
    renderAt('/login', { signedIn: false });
    fireEvent.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(callsOf(fetchMock, 'POST')).toEqual([]);
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("logs in with Firebase, then with its ID token, and opens the dashboard, the user's name in the navbar", async () => {
    const fetchMock = stubApi({
      'POST /login': { userId: 'u1' },
      'GET /me': DANA,
    });
    renderAt('/login', { signedIn: false });
    await fillIn({ Email: ' Dana@NBA.dev', Password: 'correct horse' });
    logIn();

    expect(await screen.findByText('DashboardPage')).toBeTruthy();
    expect(window.location.pathname).toBe('/');
    expect(await screen.findByText('Dana Levi')).toBeTruthy();
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      getAuth(),
      'dana@nba.dev',
      'correct horse',
    );
    expect(callsOf(fetchMock, 'POST')).toEqual([
      ['/api/login', { idToken: 'id-token-of-dana@nba.dev' }],
    ]);
    const me = fetchMock.mock.calls.find(([url]) => url === '/api/me');
    expect(me?.[1]?.headers).toMatchObject({
      authorization: 'Bearer id-token-of-dana@nba.dev',
    });
  });

  it('says why Firebase refused, and calls nothing more', async () => {
    const fetchMock = stubApi({});
    vi.mocked(signInWithEmailAndPassword)
      .mockRejectedValueOnce(firebaseError('auth/invalid-credential'))
      .mockRejectedValueOnce(firebaseError('auth/too-many-requests'));
    renderAt('/login', { signedIn: false });
    await fillIn({ Email: 'dana@nba.dev', Password: 'wrong horse' });

    logIn();
    expect(await screen.findByText('Wrong email or password')).toBeTruthy();
    logIn();
    expect(
      await screen.findByText('Too many attempts. Try again in a few minutes.'),
    ).toBeTruthy();
    expect(callsOf(fetchMock, 'POST')).toEqual([]);
  });

  it('switches between logging in and signing up in tabs, each under a title of its own, keeping what was typed', async () => {
    renderAt('/login', { signedIn: false });
    expect(
      await screen.findByRole('tab', { name: 'Log in', selected: true }),
    ).toBeTruthy();
    await fillIn({ Email: 'dana@nba.dev' });

    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }));
    expect(
      screen.getByRole('heading', { name: 'Create your account' }),
    ).toBeTruthy();
    const signUp = screen.getByRole('tabpanel', { name: 'Sign up' });
    expect(within(signUp).getByLabelText('Name')).toBeTruthy();
    expect(within(signUp).getByLabelText('Confirm password')).toBeTruthy();
    expect(
      (within(signUp).getByLabelText('Email') as HTMLInputElement).value,
    ).toBe('dana@nba.dev');
    expect(
      screen.queryByRole('button', { name: 'Forgot your password?' }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Log in' }));
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('signs up: Firebase makes the account and emails a link, and once it was opened, Continue signs up with the name', async () => {
    const fetchMock = stubApi({
      'POST /sign-up': { userId: 'u1' },
      'GET /me': DANA,
    });
    renderAt('/login', { signedIn: false });
    fireEvent.click(await screen.findByRole('tab', { name: 'Sign up' }));
    await fillIn({
      Name: 'Dana Levi',
      Email: 'dana@nba.dev',
      Password: 'correct horse',
      'Confirm password': 'correct horse',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(
      await screen.findByRole('heading', { name: 'Verify your email' }),
    ).toBeTruthy();
    expect(screen.getByText('dana@nba.dev')).toBeTruthy();
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      getAuth(),
      'dana@nba.dev',
      'correct horse',
    );
    expect(sendEmailVerification).toHaveBeenCalledWith(firebase.user);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText(
        "Your email isn't verified yet. Open the link we sent, then try again.",
      ),
    ).toBeTruthy();
    expect(callsOf(fetchMock, 'POST')).toEqual([]);

    (firebase.user as FakeUser).emailVerified = true; // the link was opened
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('DashboardPage')).toBeTruthy();
    // A new token: the one from before the link still says unverified.
    expect(firebase.user?.getIdToken).toHaveBeenCalledWith(true);
    expect(callsOf(fetchMock, 'POST')).toEqual([
      [
        '/api/sign-up',
        { idToken: 'id-token-of-dana@nba.dev', name: 'Dana Levi' },
      ],
    ]);
  });

  it('marks an email that has an account already at sign-up', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(
      firebaseError('auth/email-already-in-use'),
    );
    renderAt('/login', { signedIn: false });
    fireEvent.click(await screen.findByRole('tab', { name: 'Sign up' }));
    await fillIn({
      Name: 'Dana',
      Email: 'dana@nba.dev',
      Password: 'correct horse',
      'Confirm password': 'correct horse',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(
      await screen.findByText('This email is already registered'),
    ).toBeTruthy();
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it('asks for the password twice at sign-up, and marks a second one that differs without calling Firebase', async () => {
    renderAt('/login', { signedIn: false });
    fireEvent.click(await screen.findByRole('tab', { name: 'Sign up' }));
    await fillIn({
      Name: 'Dana',
      Email: 'dana@nba.dev',
      Password: 'correct horse',
      'Confirm password': 'correct hrose',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText("The passwords don't match")).toBeTruthy();
    expect(
      screen.getByLabelText('Confirm password').getAttribute('aria-invalid'),
    ).toBe('true');
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('sends a login whose email is not verified yet to the link, which it can send again', async () => {
    stubApi({
      'POST /login': new Failure(403, {
        statusCode: 403,
        message: 'Verify your email address first',
        code: 'Email Not Verified',
      }),
    });
    renderAt('/login', { signedIn: false });
    await fillIn({ Email: 'dana@nba.dev', Password: 'correct horse' });
    logIn();

    expect(
      await screen.findByRole('heading', { name: 'Verify your email' }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Send the link again' }),
    );
    expect(await screen.findByText('We sent a new link')).toBeTruthy();
    expect(sendEmailVerification).toHaveBeenCalledWith(firebase.user);

    fireEvent.click(screen.getByRole('button', { name: 'Back to log in' }));
    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeTruthy();
    expect(signOut).toHaveBeenCalled();
  });

  it('asks an account without a user yet (its sign-up never finished) for a name, then signs up', async () => {
    const fetchMock = stubApi({
      'POST /login': new Failure(404, {
        statusCode: 404,
        message: 'No user for this account yet: sign up',
      }),
      'POST /sign-up': { userId: 'u1' },
      'GET /me': DANA,
    });
    renderAt('/login', { signedIn: false });
    await fillIn({ Email: 'dana@nba.dev', Password: 'correct horse' });
    logIn();

    expect(
      await screen.findByRole('heading', { name: 'Finish signing up' }),
    ).toBeTruthy();
    await fillIn({ Name: 'Dana Levi' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('DashboardPage')).toBeTruthy();
    expect(callsOf(fetchMock, 'POST')).toEqual([
      ['/api/login', { idToken: 'id-token-of-dana@nba.dev' }],
      [
        '/api/sign-up',
        { idToken: 'id-token-of-dana@nba.dev', name: 'Dana Levi' },
      ],
    ]);
  });

  it('sends a password reset link, saying the same whether or not the email has an account', async () => {
    renderAt('/login', { signedIn: false });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Forgot your password?' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Reset password' }),
    ).toBeTruthy();
    await fillIn({ Email: 'Dana@nba.dev' });
    fireEvent.click(screen.getByRole('button', { name: 'Send link' }));

    expect(
      await screen.findByText(
        'If this email has an account, we sent it a link to reset the password.',
      ),
    ).toBeTruthy();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      getAuth(),
      'dana@nba.dev',
    );
  });

  it('sends someone signed in on to the dashboard', async () => {
    stubApi({ 'GET /me': DANA });
    renderAt('/login');

    expect(await screen.findByText('DashboardPage')).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });

  it("logs out from the navbar's menu, out of Firebase too, back to the login page", async () => {
    stubApi({ 'GET /me': DANA });
    renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Dana Levi' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe('/login');
    expect(signOut).toHaveBeenCalled();
  });

  it('ends a session the API no longer accepts, back to the login page', async () => {
    stubApi({
      'GET /me': new Failure(401, { statusCode: 401, message: 'Invalid' }),
    });
    renderAt('/');

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeTruthy();
    expect(signOut).toHaveBeenCalled();
  });
});
