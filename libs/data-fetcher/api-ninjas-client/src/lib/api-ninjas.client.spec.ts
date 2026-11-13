import { games, players, teams } from '../fixtures';
import { ApiNinjasClient, ApiNinjasError } from './api-ninjas.client';

describe('ApiNinjasClient', () => {
  const answer = (body: unknown, status = 200) =>
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(body), { status }));

  beforeEach(() => {
    process.env['API_NINJAS_KEY'] = 'test-key';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env['API_NINJAS_KEY'];
  });

  it('refuses to start without a key', () => {
    delete process.env['API_NINJAS_KEY'];
    expect(() => new ApiNinjasClient()).toThrow('API_NINJAS_KEY is not set');
  });

  it("asks for the NBA's, with the key", async () => {
    const fetch = answer(teams);
    await new ApiNinjasClient().players('nba-por');

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe(
      'https://api.api-ninjas.com/v1/basketballplayers?league=nba&team=nba-por',
    );
    expect(init?.headers).toEqual({ 'X-Api-Key': 'test-key' });
  });

  it('maps teams to rows', async () => {
    answer(teams);
    expect(await new ApiNinjasClient().teams()).toContainEqual({
      id: 'nba-atl',
      abbreviation: 'ATL',
      name: 'Atlanta Hawks',
      nickname: 'Hawks',
      city: 'Atlanta',
      conference: 'Eastern',
      division: 'Southeast',
      venue: {
        name: 'State Farm Arena',
        city: 'Atlanta',
        state: 'GA',
        country: 'US',
      },
      active: true,
    });
  });

  it("maps a player's missing college to null", async () => {
    answer(players);
    const rows = await new ApiNinjasClient().players('nba-por');

    expect(rows).toHaveLength(players.length);
    expect(rows.filter((row) => row.college === null)).toHaveLength(
      players.filter((player) => !('college' in player)).length,
    );
    expect(rows.every((row) => row.teamId === 'nba-por')).toBe(true);
  });

  it('maps games to rows, the start a date', async () => {
    answer(games);
    const [game] = await new ApiNinjasClient().games('2026-11-11');

    expect(game).toMatchObject({
      id: 'nba-20261111-bos-tor',
      date: '2026-11-11',
      startTime: new Date('2026-11-12T00:00:00Z'),
      status: 'final',
      homeTeamId: 'nba-tor',
      awayTeamId: 'nba-bos',
      winnerTeamId: 'nba-bos',
      homeScore: 93,
      awayScore: 98,
    });
  });

  it('throws the status of a refused call', async () => {
    answer({ error: 'Quota exceeded' }, 429);
    const error = await new ApiNinjasClient().standings().catch((e) => e);

    expect(error).toBeInstanceOf(ApiNinjasError);
    expect(error.status).toBe(429);
  });
});
