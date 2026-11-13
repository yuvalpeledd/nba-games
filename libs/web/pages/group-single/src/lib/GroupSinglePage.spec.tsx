import type { GroupDetailsDto } from '@nba/dtos-groups';
import { GroupStatus } from '@nba/sql-groups/enums';
import { appWith, Failure, stubApi } from '@nba/web-test-utils';
import { screen, within } from '@testing-library/react';
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
});
