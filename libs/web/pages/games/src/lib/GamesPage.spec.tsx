import type { GameDto } from '@nba/dtos-games';
import { GameStatus } from '@nba/sql-games/enums';
import { formatTime } from '@nba/web-core';
import { appWith, game, stubApi, team } from '@nba/web-test-utils';
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
    stubApi({
      'GET /teams': teams,
      'GET /games?from=2026-11-12': [
        final('nba-bos', 'nba-nyk', '2026-11-12', 110, 102),
        final('nba-gsw', 'nba-lal', '2026-11-12', 99, 120),
      ],
      'GET /games?from=2026-11-13': [
        game('nba-lal', 'nba-bos', '2026-11-13', {
          status: GameStatus.POSTPONED,
        }),
      ],
      'GET /games?from=2026-11-14': [],
    });
  });

  it("lists every team's games on the day", async () => {
    renderAt('/games?date=2026-11-12');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Games' }),
    ).toBeTruthy();
    expect(await rows()).toEqual([
      [
        tipOff('2026-11-12'),
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
    ]);
    expect(
      screen.getByRole('link', { name: 'Boston Celtics' }).getAttribute('href'),
    ).toBe('/teams/nba-bos');
  });

  it('moves a day at a time, or to the day picked', async () => {
    renderAt('/games?date=2026-11-12');
    await rows();

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    expect(await screen.findByText('Postponed')).toBeTruthy();
    expect(window.location.search).toBe('?date=2026-11-13');

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    expect(await screen.findByText('No games this day.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Day'), {
      target: { value: '2026-11-12' },
    });
    expect((await rows()).length).toBe(2);
  });

  it("opens on the viewer's today", async () => {
    const today = new Date().toLocaleDateString('en-CA');
    stubApi({
      'GET /teams': teams,
      [`GET /games?from=${today}`]: [game('nba-bos', 'nba-nyk', today)],
    });
    renderAt('/games');

    expect((await rows())[0]).toEqual([
      tipOff(today),
      'New York Knicks',
      'Boston Celtics',
      'N/A',
      'Scheduled',
    ]);
  });

  it('sorts by score', async () => {
    renderAt('/games?date=2026-11-12');

    fireEvent.click(await screen.findByRole('button', { name: 'Score' }));
    fireEvent.click(screen.getByRole('button', { name: 'Score' }));
    expect((await rows()).map(([, , , score]) => score)).toEqual([
      '120-99',
      '102-110',
    ]);
  });

  it("says so when they can't be loaded", async () => {
    stubApi({ 'GET /teams': teams });
    renderAt('/games?date=2026-11-12');

    expect(
      await screen.findByText(
        'Something went wrong. Refresh the page to try again.',
      ),
    ).toBeTruthy();
  });
});
