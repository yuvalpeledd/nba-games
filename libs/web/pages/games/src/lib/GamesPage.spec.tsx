import type { GameDto } from '@nba/dtos-games';
import { GameStatus } from '@nba/sql-games/enums';
import { formatTime } from '@nba/web-core';
import { ErrorCode } from '@nba/enums';
import {
  appWith,
  callsOf,
  Failure,
  game,
  season,
  stubApi,
  team,
} from '@nba/web-test-utils';
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

// Removes the filter on the games after two days ago the page opens with.
const showEveryDay = async () =>
  fireEvent.click(
    within(
      await screen.findByRole('button', { name: 'Date after 11/11/2026' }),
    ).getByTestId('CancelIcon'),
  );

describe('GamesPage', () => {
  beforeEach(() => {
    // Only the clock: the spec's waits still run.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T12:00:00'));
    stubApi(routes(games));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the games after two days ago', async () => {
    renderAt('/games');

    expect((await rows()).map(([time]) => time)).toEqual([
      tipOff('2026-11-12'),
      tipOff('2026-11-13'),
    ]);
  });

  it("opens on a link's filters instead (the dashboard's games left to pick this week)", async () => {
    stubApi(routes([...games, game('nba-gsw', 'nba-nyk', '2026-11-14')]));
    renderAt('/games', {
      state: {
        filters: [
          { column: 'time', operator: 'after', values: ['2026-11-08'] },
          { column: 'time', operator: 'before', values: ['2026-11-16'] },
          { column: 'status', operator: 'is', values: ['Scheduled'] },
          { column: 'prediction', operator: 'is', values: ['None'] },
        ],
      },
    });

    expect((await rows()).map(([time]) => time)).toEqual([
      tipOff('2026-11-14'),
    ]);
    for (const chip of [
      'Date after 08/11/2026',
      'Date before 16/11/2026',
      'Status is Scheduled',
      'Prediction is None',
    ]) {
      expect(screen.getByRole('button', { name: chip })).toBeTruthy();
    }
  });

  it("lists every team's games in the season, every day, without that filter", async () => {
    renderAt('/games');
    await showEveryDay();

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
        'None',
      ],
      [
        tipOff('2026-11-12'),
        'Los Angeles Lakers',
        'Golden State Warriors',
        '120-99',
        'Final',
        'None',
      ],
      [
        tipOff('2026-11-13'),
        'Boston Celtics',
        'Los Angeles Lakers',
        'N/A',
        'Postponed',
        // Not begun: the Away / Home toggle.
        'AwayHome',
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
    fireEvent.click(screen.getByRole('button', { name: /^Date/ }));
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
    await showEveryDay();
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

  it('filters by a number, until the filters are cleared', async () => {
    renderAt('/games');
    await showEveryDay();
    const scores = async () => (await rows()).map(([, , , score]) => score);

    fireEvent.click(await screen.findByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Total Points' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Greater Than' }), {
      target: { value: '213' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Less Than' }), {
      target: { value: '300' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    expect(await scores()).toEqual(['120-99']);

    fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    // Applied at once; the panel stays open.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(await scores()).toHaveLength(3);
  });

  it('sorts by score, the unplayed last', async () => {
    renderAt('/games');
    await showEveryDay();

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
          game('nba-bos', 'nba-nyk', '2026-11-13', { id: `game-${i}` }),
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

  describe('predictions', () => {
    // The last game (tonight, postponed) hasn't begun; the one before (final) has.
    const [, played, tonight] = games;
    const predictionRoutes = {
      ...routes(games),
      'GET /predictions?season=2026': [{ gameId: played.id, pick: 'Away' }],
      [`PUT /predictions/${tonight.id}`]: { gameId: tonight.id, pick: 'Home' },
    };

    const rowOf = async (team: string) =>
      (
        await screen.findAllByRole('row', {
          name: new RegExp(team),
        })
      )[0];

    it("shows the user's pick of a game that has begun, and picks one that hasn't", async () => {
      const fetchMock = stubApi(predictionRoutes);
      renderAt('/games');

      expect((await rows()).map((cells) => cells[5])).toEqual([
        'Away',
        'AwayHome',
      ]);
      fireEvent.click(
        within(await rowOf('Boston Celtics.*Los Angeles Lakers')).getByRole(
          'button',
          { name: 'Home' },
        ),
      );

      expect(await screen.findByText('Predicted: Home wins')).toBeTruthy();
      expect(callsOf(fetchMock, 'PUT')).toEqual([
        [`/api/predictions/${tonight.id}`, { pick: 'Home' }],
      ]);
      expect(
        within(await rowOf('Boston Celtics.*Los Angeles Lakers'))
          .getByRole('button', { name: 'Home' })
          .getAttribute('aria-pressed'),
      ).toBe('true');
    });

    it('says so when the game began meanwhile', async () => {
      stubApi({
        ...predictionRoutes,
        [`PUT /predictions/${tonight.id}`]: new Failure(409, {
          statusCode: 409,
          message: 'Locked',
          code: ErrorCode.PREDICTION_LOCKED,
        }),
      });
      renderAt('/games');

      fireEvent.click(
        within(await rowOf('Boston Celtics.*Los Angeles Lakers')).getByRole(
          'button',
          { name: 'Away' },
        ),
      );

      expect(
        await screen.findByText(
          'This game has begun: its predictions are locked',
        ),
      ).toBeTruthy();
    });

    it("can't pick a game more than 10 days away yet", async () => {
      const later = game('nba-nyk', 'nba-gsw', '2026-11-24');
      stubApi(routes([...games, later]));
      renderAt('/games');

      const buttons = within(
        await rowOf('Golden State Warriors.*New York Knicks'),
      ).getAllByRole('button', { name: /Away|Home/ });
      expect(
        buttons.map((button) => (button as HTMLButtonElement).disabled),
      ).toEqual([true, true]);
    });
  });
});
