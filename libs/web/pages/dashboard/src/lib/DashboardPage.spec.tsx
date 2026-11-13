import type { ScanDto } from '@nba/dtos-scans';
import { appWith, stubApi } from '@nba/web-test-utils';
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

describe('DashboardPage', () => {
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

  it('says hello at /, the first of the navbar', async () => {
    renderAt('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hello' }),
    ).toBeTruthy();
    const nav = within(screen.getByRole('navigation', { name: 'Navigation' }));
    expect(nav.getByRole('link', { name: 'Dashboard' }).className).toContain(
      'Mui-selected',
    );
  });

  it("leads to the navbar's other pages, and back", async () => {
    renderAt('/');
    await screen.findByRole('heading', { name: 'Hello' });
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
    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeTruthy();
  });

  it('sends an unknown address to the dashboard', async () => {
    renderAt('/nowhere');

    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });
});
