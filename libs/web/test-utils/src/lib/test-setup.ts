// Every web spec runs with these (vitest.shared.ts's setupFiles): MUI's styles kept out of jsdom, the API faked by
// stubApi, and a clean slate before each test. Specs import their handles from test-utils.
import { configure } from '@testing-library/react';

// Each spec file's first render is cold (MUI, the app's modules): Testing Library's default 1s wait can fall short.
configure({ asyncUtilTimeout: 10_000 });

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

// Fake frontend-api: maps "METHOD /path" to the `data` it returns (or a Failure); anything else is a 404.
export function stubApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '')}`;
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

beforeEach(() => {
  vi.resetAllMocks();
  stubApi({});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
