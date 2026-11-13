import { appWith, season, standing, stubApi, team } from '@nba/web-test-utils';
import type { StandingDto } from '@nba/dtos-standings';
import { fireEvent, screen, within } from '@testing-library/react';
import { StandingsPage } from './StandingsPage';

const { renderAt } = appWith({ StandingsPage });

const celtics = team('nba-bos', 'Boston Celtics', 'Eastern');
const knicks = team('nba-nyk', 'New York Knicks', 'Eastern');
const nets = team('nba-bkn', 'Brooklyn Nets', 'Eastern');
const lakers = team('nba-lal', 'Los Angeles Lakers', 'Western');
const suns = team('nba-phx', 'Phoenix Suns', 'Western');

// The API with these seasons' standings (by year), the newest first, and the teams.
const routes = (standings: Record<number, StandingDto[]>) => ({
  'GET /seasons': Object.keys(standings).map(Number).reverse().map(season),
  'GET /teams': [celtics, knicks, nets, lakers, suns],
  ...Object.fromEntries(
    Object.entries(standings).map(([year, rows]) => [
      `GET /standings?season=${year}`,
      rows,
    ]),
  ),
});

// The table's rows, each its cells' text.
const rowsOf = async (name: string) =>
  within(await screen.findByRole('table', { name }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

describe('StandingsPage', () => {
  it("shows the East's standings by seed, with each team's games behind its leader", async () => {
    stubApi(
      routes({
        // Out of order, with the provider's games behind (from the division's leader), which the page doesn't show.
        2026: [
          standing(nets, 3, 3, 10, { gamesBehind: 4 }),
          standing(celtics, 1, 10, 3),
          standing(lakers, 1, 11, 2),
          standing(knicks, 2, 9, 5, {
            streak: 'L2',
            homeRecord: '5-2',
            awayRecord: '4-3',
            conferenceRecord: '6-3',
            last10: '7-3',
            gamesBehind: 0,
          }),
        ],
      }),
    );
    renderAt('/standings');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Standings' }),
    ).toBeTruthy();
    expect(screen.getByText('2026-27')).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'East' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(await rowsOf('Eastern Conference standings')).toEqual([
      [
        '1',
        'Boston Celtics',
        '10',
        '3',
        '.769',
        '—',
        '4-2',
        '3-2',
        '3-2',
        '6-4',
        'W1',
      ],
      [
        '2',
        'New York Knicks',
        '9',
        '5',
        '.643',
        '1.5',
        '6-3',
        '5-2',
        '4-3',
        '7-3',
        'L2',
      ],
      [
        '3',
        'Brooklyn Nets',
        '3',
        '10',
        '.231',
        '7',
        '4-2',
        '3-2',
        '3-2',
        '6-4',
        'W1',
      ],
    ]);
  });

  it("shows the West's on its tab", async () => {
    stubApi(
      routes({
        2026: [
          standing(celtics, 1, 10, 3),
          standing(suns, 2, 7, 6),
          standing(lakers, 1, 13, 0),
        ],
      }),
    );
    renderAt('/standings');

    fireEvent.click(await screen.findByRole('tab', { name: 'West' }));

    expect(
      (await rowsOf('Western Conference standings')).map((row) =>
        row.slice(0, 6),
      ),
    ).toEqual([
      ['1', 'Los Angeles Lakers', '13', '0', '1.000', '—'],
      ['2', 'Phoenix Suns', '7', '6', '.538', '6'],
    ]);
  });

  it('sorts by any column, and the other way on a second click', async () => {
    stubApi(
      routes({
        2026: [
          standing(celtics, 1, 10, 3, { streak: 'W3' }),
          standing(knicks, 2, 9, 5, { streak: 'W10' }),
          standing(nets, 3, 3, 10, { streak: 'W2' }),
        ],
      }),
    );
    renderAt('/standings');
    const teams = async () =>
      (await rowsOf('Eastern Conference standings')).map(([, name]) => name);

    fireEvent.click(await screen.findByRole('button', { name: 'Team' }));
    expect(await teams()).toEqual([
      'Boston Celtics',
      'Brooklyn Nets',
      'New York Knicks',
    ]);
    // Digits as numbers: W2, W3, W10.
    fireEvent.click(screen.getByRole('button', { name: 'Strk' }));
    expect(await teams()).toEqual([
      'Brooklyn Nets',
      'Boston Celtics',
      'New York Knicks',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'L' }));
    fireEvent.click(screen.getByRole('button', { name: 'L' }));
    expect(await teams()).toEqual([
      'Brooklyn Nets',
      'New York Knicks',
      'Boston Celtics',
    ]);
  });

  it('opens the newest season that has started', async () => {
    // 2099 hasn't started; 2025 is over.
    stubApi(
      routes({
        2025: [standing(knicks, 1, 50, 32, { season: 2025 })],
        2026: [standing(celtics, 1, 10, 3)],
        2099: [standing(nets, 1, 1, 0, { season: 2099 })],
      }),
    );
    renderAt('/standings');

    expect(
      (await rowsOf('Eastern Conference standings')).map(([, name]) => name),
    ).toEqual(['Boston Celtics']);
    expect(screen.getByText('2026-27')).toBeTruthy();
  });

  it('says when there are no standings yet', async () => {
    stubApi(routes({ 2026: [] }));
    renderAt('/standings');

    expect(await screen.findByText('No standings yet.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it("says so when they can't be loaded", async () => {
    renderAt('/standings');

    expect(
      await screen.findByText(
        'Something went wrong. Refresh the page to try again.',
      ),
    ).toBeTruthy();
  });
});
