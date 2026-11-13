// Every web spec runs with these (vitest.shared.ts's setupFiles): Firebase's SDK faked, MUI's styles kept out of
// jsdom, the API faked by stubApi, and a clean slate before each test. Specs import their handles from test-utils.
import { configure } from '@testing-library/react';
import { clearSession } from '@nba/web-core';

// Each spec file's first render is cold (MUI, the app's modules): Testing Library's default 1s wait can fall short.
configure({ asyncUtilTimeout: 10_000 });

// A Firebase account as the fake SDK has it.
export interface FakeUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  reload: () => Promise<void>;
}

// Firebase's Auth, faked: who is signed in (null: no one). Exported below: Vitest can't hoist an exported
// declaration.
const firebase = vi.hoisted(() => {
  const state = {
    user: null as FakeUser | null,
    // An account whose ID token is named after its email.
    newUser: (email: string, emailVerified = true): FakeUser => ({
      uid: `firebase-${email}`,
      email,
      emailVerified,
      getIdToken: vi.fn(async () => `id-token-of-${email}`),
      reload: vi.fn(async () => undefined),
    }),
    setUser: (user: FakeUser | null) => {
      state.user = user;
    },
  };
  return state;
});
export { firebase };

vi.mock('firebase/app', () => ({
  getApps: () => [],
  initializeApp: () => ({}),
}));

vi.mock('firebase/auth', () => {
  const auth = {
    get currentUser() {
      return firebase.user;
    },
    authStateReady: async () => undefined,
  };
  // Signing in or up with Firebase succeeds unless a test says otherwise (mockRejectedValueOnce).
  const signedIn = (email: string, emailVerified: boolean) => {
    const user = firebase.newUser(email, emailVerified);
    firebase.setUser(user);
    return { user };
  };
  return {
    getAuth: () => auth,
    signInWithEmailAndPassword: vi.fn(async (_auth: unknown, email: string) =>
      signedIn(email, true),
    ),
    createUserWithEmailAndPassword: vi.fn(
      async (_auth: unknown, email: string) => signedIn(email, false),
    ),
    sendEmailVerification: vi.fn(async () => undefined),
    sendPasswordResetEmail: vi.fn(async () => undefined),
    signOut: vi.fn(async () => firebase.setUser(null)),
  };
});

// MUI's styles never reach jsdom (emotion still names every class): jsdom matches each of their rules against an
// element and every ancestor on each getComputedStyle, which role queries call for every node they name. So no test
// sees what MUI's CSS hides.
vi.mock('@emotion/cache', async (importOriginal) => {
  const { default: createCache } =
    await importOriginal<typeof import('@emotion/cache')>();
  return {
    default: (options: Parameters<typeof createCache>[0]) => {
      const cache = createCache(options);
      cache.sheet.insert = () => undefined;
      return cache;
    },
  };
});

// A route that answers with an error body instead of `{ data }`.
export class Failure {
  constructor(
    readonly status: number,
    readonly body: object,
  ) {}
}

// firebase.ts loads its config first, whatever a test's routes are.
const FIREBASE_CONFIG = {
  apiKey: 'test-key',
  authDomain: 'nba-test.firebaseapp.com',
};

// Fake frontend-api: maps "METHOD /path" to the `data` it returns (or a Failure); anything else is a 404.
export function stubApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '')}`;
    if (key === 'GET /firebase-config') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: FIREBASE_CONFIG }),
      };
    }
    const route = routes[key];
    if (route instanceof Failure) {
      return { ok: false, status: route.status, json: async () => route.body };
    }
    const found = key in routes;
    return {
      ok: found,
      status: found ? 200 : 404,
      json: async () => (found ? { data: route } : { message: 'Not found' }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(async () => {
  vi.resetAllMocks();
  stubApi({});
  clearSession();
  localStorage.clear();
  // clearSession's sign-out of Firebase settles before a test signs anyone in.
  await new Promise((resolve) => setTimeout(resolve, 0));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
