import { appWith } from '@nba/web-test-utils';
import { fireEvent, screen, within } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';

const { renderAt } = appWith({ DashboardPage });

describe('DashboardPage', () => {
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

    fireEvent.click(nav.getByRole('link', { name: 'Standings' }));
    expect(
      await screen.findByRole('heading', { name: 'StandingsPage' }),
    ).toBeTruthy();
    fireEvent.click(nav.getByRole('link', { name: 'Teams' }));
    expect(
      await screen.findByRole('heading', { name: 'TeamsPage' }),
    ).toBeTruthy();
    expect(nav.getByRole('link', { name: 'Teams' }).className).toContain(
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
