import type { GameDto } from '@nba/dtos-games';
import { GameStatus } from '@nba/sql-games/enums';
import { formatTime } from '@nba/web-core';
import { appWith, game, season, stubApi, team } from '@nba/web-test-utils';
import { fireEvent, screen, within } from '@testing-library/react';
import { GamesPage } from './GamesPage';

const { renderAt } = appWith({ GamesPage });

const teams = [
  team('nba-bos', 'Boston Celtics', 'Eastern'),
  team('nba-nyk', 'New York Knicks', 'Eastern'),
  team('nba-lal', 'Los Angeles Lakers', 'Western'),
  team('nba-gsw', 'Golden State Warriors', 'Western'),
];

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

const tipOff = (date: string) => formatTime(`${date}T23:30:00.000Z`);

// The API with the 2026-27 season's games.
const routes = (games: GameDto[]) => ({
  'GET /seasons': [season(2026)],
  'GET /teams': teams,
  'GET /games?season=2026': games,
});

const games = [
  final('nba-bos', 'nba-nyk', '2026-10-21', 110, 102),
  final('nba-gsw', 'nba-lal', '2026-11-12', 99, 120),
  game('nba-lal', 'nba-bos', '2026-11-13', { status: GameStatus.POSTPONED }),
];

const rows = async () =>
  within(await screen.findByRole('table', { name: 'Games' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

describe('GamesPage', () => {
  beforeEach(() => {
    stubApi(routes(games));
  });

  it("lists every team's games in the season, every day", async () => {
    renderAt('/games');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Games' }),
    ).toBeTruthy();
    expect(screen.getByText('2026-27')).toBeTruthy();
    expect(await rows()).toEqual([
      [
        tipOff('2026-10-21'),
        'New York Knicks',
        'Boston Celtics',
        '102-110',
        'Final',
      ],
      [
        tipOff('2026-11-12'),
        'Los Angeles Lakers',
        'Golden State Warriors',
        '120-99',
        'Final',
      ],
      [
        tipOff('2026-11-13'),
        'Boston Celtics',
        'Los Angeles Lakers',
        'N/A',
        'Postponed',
      ],
    ]);
    expect(
      screen
        .getAllByRole('link', { name: 'Boston Celtics' })[0]
        .getAttribute('href'),
    ).toBe('/teams/nba-bos');
  });

  it("filters by the league's day", async () => {
    renderAt('/games');

    fireEvent.click(await screen.findByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Date' }));
    fireEvent.change(screen.getByLabelText('After'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText('Before'), {
      target: { value: '2026-11-13' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    expect((await rows()).map(([time]) => time)).toEqual([
      tipOff('2026-11-12'),
    ]);
  });

  it('filters by any of the checked values, or none, until the filter is removed', async () => {
    renderAt('/games');
    const homes = async () => (await rows()).map(([, , home]) => home);

    fireEvent.click(await screen.findByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Boston Celtics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    expect(await homes()).toEqual(['Boston Celtics']);

    fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: /^Home/ }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Filter by' }));
    fireEvent.click(
      screen.getByRole('option', { name: 'none of the selected' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    expect(await homes()).toEqual([
      'Golden State Warriors',
      'Los Angeles Lakers',
    ]);

    fireEvent.click(
      within(
        screen.getByRole('button', { name: 'Home is not Boston Celtics' }),
      ).getByTestId('CancelIcon'),
    );
    expect(await homes()).toHaveLength(3);
  });

  it('sorts by score, the unplayed last', async () => {
    renderAt('/games');

    fireEvent.click(await screen.findByRole('button', { name: 'Score' }));
    fireEvent.click(screen.getByRole('button', { name: 'Score' }));
    expect((await rows()).map(([, , , score]) => score)).toEqual([
      '120-99',
      '102-110',
      'N/A',
    ]);
  });

  it('shows 50 games a page', async () => {
    stubApi(
      routes(
        Array.from({ length: 51 }, (_, i) =>
          game('nba-bos', 'nba-nyk', '2026-11-01', { id: `game-${i}` }),
        ),
      ),
    );
    renderAt('/games');

    expect(await rows()).toHaveLength(50);
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(await rows()).toHaveLength(1);
  });

  it('says when the season has no games yet', async () => {
    stubApi(routes([]));
    renderAt('/games');

    expect(await screen.findByText('No games this season.')).toBeTruthy();
  });

  it("says so when they can't be loaded", async () => {
    stubApi({ 'GET /seasons': [season(2026)], 'GET /teams': teams });
    renderAt('/games');

    expect(
      await screen.findByText(
        'Something went wrong. Refresh the page to try again.',
      ),
    ).toBeTruthy();
  });
});
