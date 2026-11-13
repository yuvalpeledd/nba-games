import type { GameCreateObject } from '@nba/sql-games';
import { GameStatus, SeasonType } from '@nba/sql-games/enums';
import type { PlayerCreateObject } from '@nba/sql-players';
import type { SeasonCreateObject } from '@nba/sql-seasons';
import type { StandingCreateObject } from '@nba/sql-standings';
import type { TeamCreateObject } from '@nba/sql-teams';
import type { UserCreateObject } from '@nba/sql-users';

// Rows shaped as the provider's, unique per call. Pass overrides only for what a test is about.
let next = 0;
const unique = () => (++next).toString(36).padStart(3, 'a');

export const generateTeam = (
  overrides: Partial<TeamCreateObject> = {},
): TeamCreateObject => {
  const abbreviation = unique().toUpperCase();
  return {
    id: `nba-${abbreviation.toLowerCase()}`,
    abbreviation,
    name: `Test City ${abbreviation}s`,
    nickname: `${abbreviation}s`,
    city: 'Test City',
    conference: 'Eastern',
    division: 'Atlantic',
    venue: {
      name: 'Test Arena',
      city: 'Test City',
      state: 'NY',
      country: 'USA',
    },
    active: true,
    ...overrides,
  };
};

export const generatePlayer = (
  teamId: string | null,
  overrides: Partial<PlayerCreateObject> = {},
): PlayerCreateObject => {
  const id = unique();
  return {
    id: `nba-p-${id}`,
    teamId,
    name: `First ${id} Last ${id}`,
    firstName: `First ${id}`,
    lastName: `Last ${id}`,
    position: 'G',
    jerseyNumber: '7',
    heightIn: 78,
    weightLb: 210,
    birthDate: '2000-01-01',
    birthPlace: { city: 'Test City', state: null, country: 'USA' },
    rosterStatus: 'active',
    college: null,
    experienceYears: 3,
    ...overrides,
  };
};

// Scheduled, on 2026-11-11 (or `overrides.date`) at 23:00 UTC.
export const generateGame = (
  homeTeamId: string,
  awayTeamId: string,
  overrides: Partial<GameCreateObject> = {},
): GameCreateObject => {
  const date = overrides.date ?? '2026-11-11';
  return {
    id: `nba-${date.replace(/-/g, '')}-${unique()}`,
    season: 2026,
    seasonType: SeasonType.REGULAR,
    date,
    startTime: new Date(`${date}T23:00:00Z`),
    status: GameStatus.SCHEDULED,
    statusDetail: null,
    period: null,
    clock: null,
    homeTeamId,
    awayTeamId,
    homeScore: null,
    awayScore: null,
    periodScores: null,
    decidedIn: null,
    winnerTeamId: null,
    venue: null,
    neutralSite: false,
    originalDate: null,
    ...overrides,
  };
};

export const generateStanding = (
  season: number,
  teamId: string,
  overrides: Partial<StandingCreateObject> = {},
): StandingCreateObject => ({
  season,
  teamId,
  conference: 'Eastern',
  division: 'Atlantic',
  gamesPlayed: 10,
  wins: 6,
  losses: 4,
  winPct: 0.6,
  gamesBehind: 1.5,
  pointsFor: 1150,
  pointsAgainst: 1100,
  pointDifferential: 50,
  streak: 'W2',
  homeRecord: '4-1',
  awayRecord: '2-3',
  divisionRecord: '1-1',
  conferenceRecord: '4-3',
  last10: '6-4',
  leagueRank: 1,
  conferenceRank: 1,
  divisionRank: 1,
  final: false,
  ...overrides,
});

export const generateSeason = (
  year: number,
  overrides: Partial<SeasonCreateObject> = {},
): SeasonCreateObject => {
  const end = String(year + 1).slice(2);
  return {
    id: `nba-${year}-${end}`,
    name: `NBA ${year}-${year + 1}`,
    startDate: `${year}-10-20`,
    endDate: `${year + 1}-04-11`,
    ...overrides,
  };
};

// A user with a Firebase account.
export const generateUser = (
  overrides: Partial<UserCreateObject> = {},
): UserCreateObject => ({
  name: 'Test User',
  email: `user-${unique()}@nba.dev`,
  firebaseUid: `firebase-${unique()}`,
  ...overrides,
});
