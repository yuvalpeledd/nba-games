// What the web specs share: the app rendered at a path with the spec's pages (appWith), and the data more than one
// spec starts from. The fakes are test-setup.ts's; their handles are re-exported here.
import type { StandingDto } from '@nba/dtos-standings';
import type { TeamDto } from '@nba/dtos-teams';
import { AppShell, PAGE_NAMES, type Pages } from '@nba/web-shell-components';
import { render } from '@testing-library/react';
import { Failure, stubApi } from './test-setup';

export { Failure, stubApi };

// A page the spec doesn't drive: just its name, as a heading.
const standInOf = (name: string) => () => <h1>{name}</h1>;

// The app with the spec's pages, and stand-ins for the rest.
export const appWith = (pages: Partial<Pages>) => {
  const everyPage = {
    ...(Object.fromEntries(
      PAGE_NAMES.map((name) => [name, standInOf(name)]),
    ) as Pages),
    ...pages,
  };
  const renderAt = (path: string) => {
    window.history.pushState({}, '', path);
    render(<AppShell pages={everyPage} />);
  };
  return { renderAt };
};

export const team = (
  id: string,
  name: string,
  conference: string,
): TeamDto => ({
  id,
  abbreviation: id.replace('nba-', '').toUpperCase(),
  name,
  nickname: name.split(' ').pop() as string,
  city: name.split(' ')[0],
  conference,
  division: conference === 'Eastern' ? 'Atlantic' : 'Pacific',
});

// A team's row in the 2026-27 standings: its seed and record, the rest a test's overrides.
export const standing = (
  { id, name, abbreviation, conference }: TeamDto,
  conferenceRank: number,
  wins: number,
  losses: number,
  overrides: Partial<StandingDto> = {},
): StandingDto => ({
  season: 2026,
  team: { id, name, abbreviation },
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
