import type { GameDto } from '@nba/dtos-games';
import type { PredictionDto } from '@nba/dtos-predictions';
import type { ScanDto } from '@nba/dtos-scans';
import { GameStatus } from '@nba/sql-games/enums';
import { PredictionPick } from '@nba/sql-predictions/enums';
import { appWith, game, season, stubApi } from '@nba/web-test-utils';
import { fireEvent, screen, within } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';

const { renderAt } = appWith({ DashboardPage });

const scan: ScanDto = {
  startedAt: '2026-11-13T10:00:00.000Z',
  finishedAt: '2026-11-13T10:00:42.000Z',
  success: true,
  inserted: 3,
  updated: 10,
  unchanged: 499,
  error: null,
};

// A final the home team won.
const homeWon = (date: string): GameDto =>
  game('nba-bos', 'nba-nyk', date, {
    status: GameStatus.FINAL,
    homeScore: 110,
    awayScore: 100,
    winnerTeamId: 'nba-bos',
  });

const pick = (g: GameDto, p: PredictionPick | null): PredictionDto => ({
  gameId: g.id,
  pick: p,
});

describe('DashboardPage', () => {
  describe('predictions', () => {
    // Friday 2026-11-13: the week is Monday 11-09 to Sunday 11-15.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-13T12:00:00'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const counter = async (name: string) =>
      within(
        await within(
          await screen.findByRole('region', { name: 'Predictions' }),
        ).findByRole('group', { name }),
      );

    const lastWeek = homeWon('2026-11-08');
    const wrong = homeWon('2026-11-10');
    const right = homeWon('2026-11-11');
    const unpicked = homeWon('2026-11-12');
    const picked = game('nba-lal', 'nba-gsw', '2026-11-14');
    const open = game('nba-lal', 'nba-gsw', '2026-11-15');
    const takenBack = game('nba-gsw', 'nba-lal', '2026-11-15');
    const nextWeek = game('nba-lal', 'nba-gsw', '2026-11-16');

    const routes = (predictions: PredictionDto[]) => ({
      'GET /scans/last': null,
      'GET /seasons': [season(2026)],
      'GET /games?season=2026': [
        lastWeek,
        wrong,
        right,
        unpicked,
        picked,
        open,
        takenBack,
        nextWeek,
      ],
      'GET /predictions?season=2026': predictions,
    });

    it("counts this week's games still to pick, and how often the picks were right this week and this season", async () => {
      stubApi(
        routes([
          pick(lastWeek, PredictionPick.HOME),
          pick(wrong, PredictionPick.AWAY),
          pick(right, PredictionPick.HOME),
          pick(picked, PredictionPick.HOME),
          pick(takenBack, null),
        ]),
      );
      renderAt('/');

      const left = await counter('Left this week');
      expect(left.getByText('2')).toBeTruthy();
      expect(left.getByText('of 6 games this week')).toBeTruthy();
      const week = await counter('Success this week');
      expect(week.getByText('50.0%')).toBeTruthy();
      expect(week.getByText('1 of 2 right')).toBeTruthy();
      const wholeSeason = await counter('Success this season');
      expect(wholeSeason.getByText('66.7%')).toBeTruthy();
      expect(wholeSeason.getByText('2 of 3 right')).toBeTruthy();
    });

    it("leads from the games left to the games table, filtered to this week's scheduled games without a pick", async () => {
      stubApi(routes([]));
      renderAt('/');

      fireEvent.click(
        await (await counter('Left this week')).findByRole('link'),
      );
      expect(
        await screen.findByRole('heading', { name: 'GamesPage' }),
      ).toBeTruthy();
      expect(window.location.pathname).toBe('/games');
      expect(window.history.state.usr).toEqual({
        filters: [
          { column: 'time', operator: 'after', values: ['2026-11-08'] },
          { column: 'time', operator: 'before', values: ['2026-11-16'] },
          { column: 'status', operator: 'is', values: ['Scheduled'] },
          { column: 'prediction', operator: 'is', values: ['None'] },
        ],
      });
    });

    it('shows no success rate before any pick is scored', async () => {
      stubApi(routes([]));
      renderAt('/');

      expect((await counter('Left this week')).getByText('3')).toBeTruthy();
      for (const name of ['Success this week', 'Success this season']) {
        const rate = await counter(name);
        expect(rate.getByText('—')).toBeTruthy();
        expect(rate.getByText('No results yet')).toBeTruthy();
      }
    });
  });

  describe('last scan', () => {
    const card = async () =>
      within(await screen.findByRole('region', { name: 'Last scan' }));

    it('shows when the data-fetcher last ran, that it succeeded and what it wrote', async () => {
      stubApi({ 'GET /scans/last': scan });
      renderAt('/');

      const lastScan = await card();
      expect(await lastScan.findByText('Succeeded')).toBeTruthy();
      expect(lastScan.getByText(/, in 42s$/)).toBeTruthy();
      expect(
        lastScan.getByText('3 added, 10 updated, 499 unchanged'),
      ).toBeTruthy();
    });

    it("shows a failed scan's errors", async () => {
      stubApi({
        'GET /scans/last': {
          ...scan,
          success: false,
          error: 'GamesFetcherService: Games failed for 2026-11-11',
        },
      });
      renderAt('/');

      const lastScan = await card();
      expect(await lastScan.findByText('Failed')).toBeTruthy();
      expect(lastScan.getByRole('alert').textContent).toBe(
        'GamesFetcherService: Games failed for 2026-11-11',
      );
    });

    it('says when there was none yet', async () => {
      stubApi({ 'GET /scans/last': null });
      renderAt('/');

      expect(await (await card()).findByText('No scan yet')).toBeTruthy();
    });
  });

  it('opens at /, the first of the navbar, on the predictions without a greeting', async () => {
    renderAt('/');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Predictions' }),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    const nav = within(screen.getByRole('navigation', { name: 'Navigation' }));
    expect(nav.getByRole('link', { name: 'Dashboard' }).className).toContain(
      'Mui-selected',
    );
  });

  it("leads to the navbar's other pages, and back", async () => {
    renderAt('/');
    await screen.findByRole('heading', { name: 'Predictions' });
    const nav = within(screen.getByRole('navigation', { name: 'Navigation' }));

    fireEvent.click(nav.getByRole('link', { name: 'Games' }));
    expect(
      await screen.findByRole('heading', { name: 'GamesPage' }),
    ).toBeTruthy();
    fireEvent.click(nav.getByRole('link', { name: 'Standings' }));
    expect(
      await screen.findByRole('heading', { name: 'StandingsPage' }),
    ).toBeTruthy();
    expect(nav.getByRole('link', { name: 'Standings' }).className).toContain(
      'Mui-selected',
    );
    fireEvent.click(nav.getByRole('link', { name: 'Dashboard' }));
    expect(
      await screen.findByRole('heading', { name: 'Predictions' }),
    ).toBeTruthy();
  });

  it('sends an unknown address to the dashboard', async () => {
    renderAt('/nowhere');

    expect(
      await screen.findByRole('heading', { name: 'Predictions' }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });
});
