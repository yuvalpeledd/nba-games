// What the web specs share: the app rendered at a path with the spec's pages (appWith), and the data more than one
// spec starts from. The fakes are test-setup.ts's; their handles are re-exported here.
import type { GameDto } from '@nba/dtos-games';
import type { SeasonDto } from '@nba/dtos-seasons';
import { GameStatus, SeasonType } from '@nba/sql-games/enums';
import type { StandingDto } from '@nba/dtos-standings';
import type { TeamDto } from '@nba/dtos-teams';
import { formatSeason, startSession } from '@nba/web-core';
import { AppShell, PAGE_NAMES, type Pages } from '@nba/web-shell-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { Failure, firebase, stubApi } from './test-setup';

export { Failure, firebase, stubApi };
export type { FakeUser } from './test-setup';

// A Firebase error, by its code.
export const firebaseError = (code: string) =>
  Object.assign(new Error(`Firebase: (${code}).`), { code });

// Signed in with Firebase as Dana, and with the API as `userId`.
export const signIn = (userId = 'u1') => {
  firebase.setUser(firebase.newUser('dana@nba.dev'));
  startSession({ userId });
};

// The calls the fake API got with this method: [url, JSON body].
export const callsOf = (
  fetchMock: ReturnType<typeof stubApi>,
  method: string,
) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === method)
    .map(([url, init]) => [url, init?.body && JSON.parse(`${init.body}`)]);

// Types into each field, by its label.
export const fillIn = async (fields: Record<string, string>) => {
  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(await screen.findByLabelText(label), {
      target: { value },
    });
  }
};

// A page the spec doesn't drive: just its name, as a heading.
const standInOf = (name: string) => () => <h1>{name}</h1>;

// The app with the spec's pages, and stand-ins for the rest, for someone signed in (signIn()) unless `signedIn` is false.
export const appWith = (pages: Partial<Pages>) => {
  const everyPage = {
    ...(Object.fromEntries(
      PAGE_NAMES.map((name) => [name, standInOf(name)]),
    ) as Pages),
    ...pages,
  };
  const renderAt = (path: string, { signedIn = true } = {}) => {
    if (signedIn) signIn();
    window.history.pushState({}, '', path);
    render(<AppShell pages={everyPage} />);
  };
  return { renderAt };
};

// A season by its year (2026 is 2026-27), from October to April.
export const season = (year: number): SeasonDto => ({
  id: `nba-${formatSeason(year)}`,
  name: `NBA ${year}-${year + 1}`,
  year,
  startDate: `${year}-10-20`,
  endDate: `${year + 1}-04-11`,
});

export const team = (
  id: string,
  name: string,
  conference: string,
  active = true,
): TeamDto => ({
  id,
  abbreviation: id.replace('nba-', '').toUpperCase(),
  name,
  nickname: name.split(' ').pop() as string,
  city: name.split(' ')[0],
  conference,
  division: conference === 'Eastern' ? 'Atlantic' : 'Pacific',
  venue: {
    name: 'Arena',
    city: name.split(' ')[0],
    state: null,
    country: 'US',
  },
  active,
});

// A team's row in the 2026-27 standings: its seed and record, the rest a test's overrides.
export const standing = (
  { id, conference }: TeamDto,
  conferenceRank: number,
  wins: number,
  losses: number,
  overrides: Partial<StandingDto> = {},
): StandingDto => ({
  season: 2026,
  teamId: id,
  conference,
  division: conference === 'Eastern' ? 'Atlantic' : 'Pacific',
  gamesPlayed: wins + losses,
  wins,
  losses,
  winPct: wins / (wins + losses),
  gamesBehind: 0,
  pointsFor: 1500,
  pointsAgainst: 1450,
  pointDifferential: 50,
  streak: 'W1',
  homeRecord: '3-2',
  awayRecord: '3-2',
  divisionRecord: '2-1',
  conferenceRecord: '4-2',
  last10: '6-4',
  leagueRank: conferenceRank,
  conferenceRank,
  divisionRank: 1,
  final: false,
  ...overrides,
});

// A 2026-27 game, scheduled; a test's overrides for the rest.
export const game = (
  home: string,
  away: string,
  date: string,
  overrides: Partial<GameDto> = {},
): GameDto => ({
  id: `nba-${date.replaceAll('-', '')}-${home}-${away}`,
  season: 2026,
  seasonType: SeasonType.REGULAR,
  date,
  startTime: `${date}T23:30:00.000Z`,
  status: GameStatus.SCHEDULED,
  statusDetail: null,
  period: null,
  clock: null,
  homeTeamId: home,
  awayTeamId: away,
  homeScore: null,
  awayScore: null,
  periodScores: null,
  decidedIn: null,
  winnerTeamId: null,
  venue: null,
  neutralSite: false,
  originalDate: null,
  ...overrides,
});
