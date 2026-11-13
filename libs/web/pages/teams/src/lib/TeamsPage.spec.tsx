import { appWith, stubApi, team } from '@nba/web-test-utils';
import { fireEvent, screen, within } from '@testing-library/react';
import { TeamsPage } from './TeamsPage';

const { renderAt } = appWith({ TeamsPage });

const rows = async () =>
  within(await screen.findByRole('table', { name: 'Teams' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

describe('TeamsPage', () => {
  beforeEach(() => {
    stubApi({
      'GET /teams': [
        team('nba-atl', 'Atlanta Hawks', 'Eastern'),
        team('nba-bos', 'Boston Celtics', 'Eastern'),
        team('nba-dal', 'Dallas Mavericks', 'Western'),
        team('nba-phi', 'Philadelphia 76ers', 'Eastern'),
        // A past franchise: not listed.
        team('nba-sea', 'Seattle SuperSonics', 'Western', false),
      ],
    });
  });

  it("lists the teams with their conference, in the API's order", async () => {
    renderAt('/teams');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Teams' }),
    ).toBeTruthy();
    expect(await rows()).toEqual([
      ['Atlanta Hawks', 'Eastern'],
      ['Boston Celtics', 'Eastern'],
      ['Dallas Mavericks', 'Western'],
      ['Philadelphia 76ers', 'Eastern'],
    ]);
  });

  it('sorts by conference, and by name the other way', async () => {
    renderAt('/teams');

    fireEvent.click(await screen.findByRole('button', { name: 'Conference' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conference' }));
    expect((await rows())[0]).toEqual(['Dallas Mavericks', 'Western']);

    fireEvent.click(screen.getByRole('button', { name: 'Team' }));
    fireEvent.click(screen.getByRole('button', { name: 'Team' }));
    expect((await rows()).map(([name]) => name)).toEqual([
      'Philadelphia 76ers',
      'Dallas Mavericks',
      'Boston Celtics',
      'Atlanta Hawks',
    ]);
  });

  it('filters by any of the checked values, or none, until the filter is removed', async () => {
    renderAt('/teams');
    const filterBy = (mode: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
      fireEvent.click(screen.getByRole('button', { name: /^Conference/ }));
      fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Filter by' }));
      fireEvent.click(screen.getByRole('option', { name: mode }));
      fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
      fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    };

    fireEvent.click(await screen.findByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conference' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Western' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    expect(await rows()).toEqual([['Dallas Mavericks', 'Western']]);
    expect(
      screen.getByRole('button', { name: 'Conference is Western' }),
    ).toBeTruthy();

    filterBy('none of the selected');
    expect((await rows()).map(([name]) => name)).toEqual([
      'Atlanta Hawks',
      'Boston Celtics',
      'Philadelphia 76ers',
    ]);

    fireEvent.click(
      within(
        screen.getByRole('button', { name: 'Conference is not Western' }),
      ).getByTestId('CancelIcon'),
    );
    expect(await rows()).toHaveLength(4);
  });

  it("says so when they can't be loaded", async () => {
    stubApi({});
    renderAt('/teams');

    expect(
      await screen.findByText(
        'Something went wrong. Refresh the page to try again.',
      ),
    ).toBeTruthy();
  });
});
