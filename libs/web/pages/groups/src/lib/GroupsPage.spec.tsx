import type { GroupDto } from '@nba/dtos-groups';
import { GroupStatus } from '@nba/sql-groups/enums';
import { appWith, callsOf, Failure, stubApi } from '@nba/web-test-utils';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GroupsPage } from './GroupsPage';

const { renderAt } = appWith({ GroupsPage });

const group = (
  name: string,
  owner: string,
  overrides: Partial<GroupDto> = {},
): GroupDto => ({
  id: `group-${name}`,
  name,
  public: true,
  status: GroupStatus.ACTIVE,
  owner: { id: `user-${owner}`, name: owner },
  memberCount: 1,
  ...overrides,
});

// The table's rows, each its cells' text.
const rows = async () =>
  within(await screen.findByRole('table', { name: 'Groups' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

const openNewGroup = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'New Group' }));
  return screen.findByRole('dialog', { name: 'New Group' });
};

describe('GroupsPage', () => {
  it('lists the groups, from the navbar', async () => {
    stubApi({
      'GET /groups': [
        group('Friday League', 'Dana Levi', { public: false, memberCount: 3 }),
        group('Open Court', 'Omer Cohen', { status: GroupStatus.CLOSED }),
      ],
    });
    renderAt('/');

    fireEvent.click(
      within(await screen.findByRole('navigation')).getByRole('link', {
        name: 'Groups',
      }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Groups' }),
    ).toBeTruthy();
    expect(await rows()).toEqual([
      ['Friday League', '3', 'Dana Levi', 'No', 'Active'],
      ['Open Court', '1', 'Omer Cohen', 'Yes', 'Closed'],
    ]);
  });

  it('makes a group with New Group, then says so', async () => {
    const fetchMock = stubApi({
      'GET /groups': [],
      'POST /groups': group('Friday League', 'Dana Levi'),
    });
    renderAt('/groups');
    expect(await screen.findByText('No groups yet.')).toBeTruthy();

    const dialog = await openNewGroup();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Name/ }), {
      target: { value: ' Friday League ' },
    });
    fireEvent.click(within(dialog).getByLabelText('Public'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Group Friday League created')).toBeTruthy();
    expect(callsOf(fetchMock, 'POST')).toEqual([
      ['/api/groups', { name: 'Friday League', public: true }],
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Reloaded, with the new group.
    expect(
      fetchMock.mock.calls.filter(([url]) => url === '/api/groups'),
    ).toHaveLength(3);
  });

  it('asks for a name before sending anything', async () => {
    const fetchMock = stubApi({ 'GET /groups': [] });
    renderAt('/groups');

    const dialog = await openNewGroup();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(
      await within(dialog).findByText(
        'A name of up to 100 characters is required',
      ),
    ).toBeTruthy();
    expect(callsOf(fetchMock, 'POST')).toEqual([]);
  });

  it('keeps the dialog open when the group could not be made', async () => {
    stubApi({
      'GET /groups': [],
      'POST /groups': new Failure(500, { statusCode: 500, message: 'Boom' }),
    });
    renderAt('/groups');

    const dialog = await openNewGroup();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Name/ }), {
      target: { value: 'Friday League' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText("Couldn't create the group, try again"),
    ).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'New Group' })).toBeTruthy();
  });
});
