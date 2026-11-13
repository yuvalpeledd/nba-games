import type { GameDto } from '@nba/dtos-games';
import type { PlayerDto } from '@nba/dtos-players';
import { GameStatus, SeasonType } from '@nba/sql-games/enums';
import { formatTime } from '@nba/web-core';
import { appWith, season, standing, stubApi, team } from '@nba/web-test-utils';
import { fireEvent, screen, within } from '@testing-library/react';
import { TeamSinglePage } from './TeamSinglePage';

const { renderAt } = appWith({ TeamSinglePage });

const celtics = team('nba-bos', 'Boston Celtics', 'Eastern');
const knicks = team('nba-nyk', 'New York Knicks', 'Eastern');
const lakers = team('nba-lal', 'Los Angeles Lakers', 'Western');

// A 2026-27 game, scheduled; a test's overrides for the rest.
const game = (
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

// A final, by its scores.
const final = (
  home: string,
  away: string,
  date: string,
  homeScore: number,
  awayScore: number,
): GameDto =>
  game(home, away, date, {
    status: GameStatus.FINAL,
    homeScore,
    awayScore,
    winnerTeamId: homeScore > awayScore ? home : away,
  });

const player = (
  name: string,
  overrides: Partial<PlayerDto> = {},
): PlayerDto => ({
  id: `nba-p-${name}`,
  teamId: celtics.id,
  name,
  firstName: name.split(' ')[0],
  lastName: name.split(' ')[1],
  position: 'F',
  jerseyNumber: '0',
  heightIn: 80,
  weightLb: 210,
  birthDate: null,
  birthPlace: null,
  rosterStatus: 'active',
  college: 'Duke',
  experienceYears: 3,
  ...overrides,
});

// The scheduled game's tip-off on the viewer's clock (the machine's time zone).
const tipOff = formatTime('2026-11-20T23:30:00.000Z');
const games = [
  final('nba-bos', 'nba-nyk', '2026-10-21', 110, 102),
  final('nba-nyk', 'nba-bos', '2026-10-25', 99, 95),
  game('nba-bos', 'nba-lal', '2026-11-20'),
  game('nba-lal', 'nba-bos', '2026-11-22', {
    status: GameStatus.POSTPONED,
  }),
  {
    ...final('nba-bos', 'nba-nyk', '2027-04-20', 120, 100),
    seasonType: SeasonType.POSTSEASON,
  },
];

// The API with the Celtics' 2026-27 season and roster.
const routes = (overrides: Record<string, unknown> = {}) => ({
  'GET /seasons': [season(2026)],
  'GET /teams': [celtics, knicks, lakers],
  'GET /standings?season=2026': [
    standing(celtics, 1, 10, 3, { streak: 'W4' }),
    standing(knicks, 2, 9, 5),
  ],
  'GET /games?season=2026&teamId=nba-bos': games,
  'GET /players?teamId=nba-bos': [
    player('Jaylen Brown', { jerseyNumber: '7', heightIn: 78 }),
    player('Jayson Tatum', { experienceYears: 0, college: null }),
  ],
  ...overrides,
});

const rowsOf = async (name: string) =>
  within(await screen.findByRole('table', { name }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

describe('TeamSinglePage', () => {
  it("shows the team and its season's standing", async () => {
    stubApi(routes());
    renderAt('/teams/nba-bos');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Boston Celtics' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Eastern Conference · Atlantic Division · Arena, Boston',
      ),
    ).toBeTruthy();
    expect(
      await screen.findByRole('heading', { name: '2026-27' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(
      ['Record', 'PCT', 'Seed', 'Home', 'Away', 'L10', 'Streak'],
    );
    expect(
      screen.getAllByRole('definition').map((value) => value.textContent),
    ).toEqual(['10-3', '76.9%', '1', '3-2', '3-2', '6-4', 'W4']);
  });

  it("lists the team's games, from its side", async () => {
    stubApi(routes());
    renderAt('/teams/nba-bos');

    expect(await rowsOf('Games')).toEqual([
      ['Wed, Oct 21', 'vs New York Knicks', 'W 110-102', ''],
      ['Sun, Oct 25', '@ New York Knicks', 'L 95-99', ''],
      ['Fri, Nov 20', 'vs Los Angeles Lakers', tipOff, ''],
      ['Sun, Nov 22', '@ Los Angeles Lakers', 'Postponed', ''],
      ['Tue, Apr 20', 'vs New York Knicks · Playoffs', 'W 120-100', ''],
    ]);
    expect(
      screen
        .getAllByRole('link', { name: 'New York Knicks' })[0]
        .getAttribute('href'),
    ).toBe('/teams/nba-nyk');
  });

  it('sorts the games by margin, the unplayed last', async () => {
    stubApi(routes());
    renderAt('/teams/nba-bos');

    fireEvent.click(await screen.findByRole('button', { name: 'Result' }));
    fireEvent.click(screen.getByRole('button', { name: 'Result' }));
    expect((await rowsOf('Games')).map(([, , result]) => result)).toEqual([
      'W 120-100',
      'W 110-102',
      'L 95-99',
      tipOff,
      'Postponed',
    ]);
  });

  it("shows the team's record against a game's opponent from its menu", async () => {
    stubApi(
      routes({
        'GET /games?teamId=nba-bos&opponentId=nba-nyk': [
          {
            ...final('nba-nyk', 'nba-bos', '2026-03-01', 100, 90),
            season: 2025,
          },
          final('nba-bos', 'nba-nyk', '2026-10-21', 110, 102),
          final('nba-nyk', 'nba-bos', '2026-10-25', 99, 95),
          game('nba-bos', 'nba-nyk', '2026-12-25'),
        ],
      }),
    );
    renderAt('/teams/nba-bos');

    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'Actions' }))[0],
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Statistics' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Against New York Knicks',
    });
    expect(
      (await within(dialog).findAllByRole('term')).map(
        (term) => term.textContent,
      ),
    ).toEqual(['Home games', 'Home win rate', 'Away games', 'Away win rate']);
    expect(
      within(dialog)
        .getAllByRole('definition')
        .map((value) => value.textContent),
    ).toEqual(['1', '100.0%', '2', '0.0%']);
    expect(await rowsOf('Previous games')).toEqual([
      ['2026-27', 'Sun, Oct 25', 'Away', 'L 95-99'],
      ['2026-27', 'Wed, Oct 21', 'Home', 'W 110-102'],
      ['2025-26', 'Sun, Mar 1', 'Away', 'L 90-100'],
    ]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says so when the teams have never played', async () => {
    stubApi(routes({ 'GET /games?teamId=nba-bos&opponentId=nba-lal': [] }));
    renderAt('/teams/nba-bos');

    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'Actions' }))[2],
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Statistics' }),
    );
    expect(await screen.findByText('No games against them yet.')).toBeTruthy();
  });

  it("lists the team's players on the Players tab", async () => {
    stubApi(routes());
    renderAt('/teams/nba-bos');

    fireEvent.click(await screen.findByRole('tab', { name: 'Players' }));
    expect(await rowsOf('Players')).toEqual([
      ['7', 'Jaylen Brown', 'F', '6-6', '210', '3', 'Duke'],
      ['0', 'Jayson Tatum', 'F', '6-8', '210', 'R', '—'],
    ]);
  });

  it('says so when the team has no games or players yet', async () => {
    stubApi(
      routes({
        'GET /games?season=2026&teamId=nba-bos': [],
        'GET /players?teamId=nba-bos': [],
      }),
    );
    renderAt('/teams/nba-bos');

    expect(await screen.findByText('No games this season.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Players' }));
    expect(await screen.findByText('No players yet.')).toBeTruthy();
  });

  it('says so for an unknown team', async () => {
    stubApi(routes());
    renderAt('/teams/nba-xyz');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Team not found' }),
    ).toBeTruthy();
  });

  it("says so when the games can't be loaded", async () => {
    stubApi(
      Object.fromEntries(
        Object.entries(routes()).filter(
          ([key]) => !key.startsWith('GET /games'),
        ),
      ),
    );
    renderAt('/teams/nba-bos');

    expect(
      await screen.findByText(
        'Something went wrong. Refresh the page to try again.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Boston Celtics' }),
    ).toBeTruthy();
  });
});
