import type { GroupDetailsDto } from '@nba/dtos-groups';
import { GroupStatus } from '@nba/sql-groups/enums';
import { appWith, callsOf, Failure, stubApi } from '@nba/web-test-utils';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GroupSinglePage } from './GroupSinglePage';

const { renderAt } = appWith({ GroupSinglePage });

const ID = '6f1c2b8e-0d4a-4e7b-9a3c-1f2e3d4c5b6a';

const friday: GroupDetailsDto = {
  id: ID,
  name: 'Friday League',
  public: false,
  status: GroupStatus.ACTIVE,
  owner: { id: 'user-dana', name: 'Dana Levi' },
  memberCount: 2,
  isMember: true,
  members: [
    { id: 'user-dana', name: 'Dana Levi' },
    { id: 'user-omer', name: 'Omer Cohen' },
  ],
};

describe('GroupSinglePage', () => {
  it('shows the group and its members, the owner marked', async () => {
    stubApi({ [`GET /groups/${ID}`]: friday });
    renderAt(`/groups/${ID}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Friday League' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Private · Active · Owned by Dana Levi · You are a member',
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole('list', { name: 'Members' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Dana LeviOwner', 'Omer Cohen']);
  });

  it("says when there's no such group, or it's private", async () => {
    stubApi({
      [`GET /groups/${ID}`]: new Failure(404, {
        statusCode: 404,
        message: `Group ${ID} not found`,
      }),
    });
    renderAt(`/groups/${ID}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Group not found' }),
    ).toBeTruthy();
  });

  describe("its owner's Edit and Delete", () => {
    // Owned by the signed-in user (signIn()'s u1).
    const mine: GroupDetailsDto = {
      ...friday,
      owner: { id: 'u1', name: 'Dana Levi' },
      members: [{ id: 'u1', name: 'Dana Levi' }],
      memberCount: 1,
    };

    it("aren't there for a group the user doesn't own", async () => {
      stubApi({ [`GET /groups/${ID}`]: friday });
      renderAt(`/groups/${ID}`);

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Friday League' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });

    it('Edit renames the group, then says so', async () => {
      const fetchMock = stubApi({
        [`GET /groups/${ID}`]: mine,
        [`PATCH /groups/${ID}`]: { ...mine, name: 'Sunday League' },
      });
      renderAt(`/groups/${ID}`);

      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
      const dialog = await screen.findByRole('dialog', { name: 'Edit Group' });
      fireEvent.change(within(dialog).getByRole('textbox', { name: /Name/ }), {
        target: { value: 'Sunday League' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Group Sunday League saved')).toBeTruthy();
      expect(callsOf(fetchMock, 'PATCH')).toEqual([
        [`/api/groups/${ID}`, { name: 'Sunday League', public: false }],
      ]);
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('Delete, once confirmed, deletes the group and goes back to the groups', async () => {
      const fetchMock = stubApi({
        [`GET /groups/${ID}`]: mine,
        [`DELETE /groups/${ID}`]: undefined,
      });
      renderAt(`/groups/${ID}`);

      fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
      fireEvent.click(
        within(
          await screen.findByRole('dialog', { name: 'Delete Friday League?' }),
        ).getByRole('button', { name: 'Delete' }),
      );

      // The groups page (a stand-in here) says it, from the link's state.
      expect(
        await screen.findByRole('heading', { level: 1, name: 'GroupsPage' }),
      ).toBeTruthy();
      expect(window.history.state.usr).toEqual({
        toast: 'Group Friday League deleted',
      });
      expect(callsOf(fetchMock, 'DELETE')).toEqual([
        [`/api/groups/${ID}`, undefined],
      ]);
    });
  });
});
