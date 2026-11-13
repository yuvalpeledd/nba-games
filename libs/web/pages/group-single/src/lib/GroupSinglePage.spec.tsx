import type { GameDto } from '@nba/dtos-games';
import type {
  GroupDetailsDto,
  GroupMemberPredictionDto,
} from '@nba/dtos-groups';
import { GameStatus } from '@nba/sql-games/enums';
import { GroupStatus } from '@nba/sql-groups/enums';
import { PredictionPick } from '@nba/sql-predictions/enums';
import {
  appWith,
  callsOf,
  Failure,
  game,
  season,
  stubApi,
  team,
} from '@nba/web-test-utils';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GroupSinglePage } from './GroupSinglePage';

const { renderAt } = appWith({ GroupSinglePage });

const ID = '6f1c2b8e-0d4a-4e7b-9a3c-1f2e3d4c5b6a';

const member = (name: string, score: number) => ({
  id: `user-${name.split(' ')[0].toLowerCase()}`,
  name,
  score,
});

const friday: GroupDetailsDto = {
  id: ID,
  name: 'Friday League',
  public: false,
  status: GroupStatus.ACTIVE,
  owner: { id: 'user-dana', name: 'Dana Levi' },
  memberCount: 2,
  isMember: true,
  members: [member('Dana Levi', 3), member('Omer Cohen', 5)],
};

// Boston beat New York at home yesterday; the Lakers host Boston tomorrow.
const played: GameDto = game('nba-bos', 'nba-nyk', '2026-11-12', {
  status: GameStatus.FINAL,
  homeScore: 110,
  awayScore: 100,
  winnerTeamId: 'nba-bos',
});
const upcoming: GameDto = game('nba-lal', 'nba-bos', '2026-11-14');

const routes = (
  group: GroupDetailsDto,
  extra: Record<string, unknown> = {},
) => ({
  [`GET /groups/${ID}`]: group,
  'GET /seasons': [season(2026)],
  'GET /teams': [
    team('nba-bos', 'Boston Celtics', 'Eastern'),
    team('nba-nyk', 'New York Knicks', 'Eastern'),
    team('nba-lal', 'Los Angeles Lakers', 'Western'),
  ],
  'GET /games?season=2026': [played, upcoming],
  'GET /predictions?season=2026': [],
  ...extra,
});

const cellsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );

const openPredictions = async (gameIndex: number) => {
  const games = await screen.findByRole('table', { name: 'Games' });
  fireEvent.click(
    within(games).getAllByRole('button', { name: 'Actions' })[gameIndex],
  );
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Predictions' }));
  return screen.findByRole('dialog');
};

describe('GroupSinglePage', () => {
  beforeEach(() => {
    // Only the clock: the spec's waits still run.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the group, and its scoreboard by score, the owner marked', async () => {
    stubApi(routes(friday));
    renderAt(`/groups/${ID}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Friday League' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Private · Active · Owned by Dana Levi · You are a member',
      ),
    ).toBeTruthy();
    expect(cellsOf(screen.getByRole('table', { name: 'Scoreboard' }))).toEqual([
      ['1', 'Omer Cohen', '5'],
      ['2', 'Dana Levi · Owner', '3'],
    ]);
  });

  it('pages the scoreboard 5 at a time, equal scores sharing a rank', async () => {
    stubApi(
      routes({
        ...friday,
        memberCount: 7,
        members: [
          member('Dana Levi', 3),
          member('Omer Cohen', 5),
          member('Noam Bar', 5),
          member('Lior Katz', 1),
          member('Maya Gold', 0),
          member('Tal Ron', 2),
          member('Yael Mor', 4),
        ],
      }),
    );
    renderAt(`/groups/${ID}`);

    const scoreboard = await screen.findByRole('table', {
      name: 'Scoreboard',
    });
    expect(
      cellsOf(scoreboard).map(([rank, name]) => `${rank} ${name}`),
    ).toEqual([
      '1 Omer Cohen',
      '1 Noam Bar',
      '3 Yael Mor',
      '4 Dana Levi · Owner',
      '5 Tal Ron',
    ]);
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Scoreboard' })).getByRole(
        'button',
        { name: 'Go to next page' },
      ),
    );
    expect(
      cellsOf(scoreboard).map(([rank, name]) => `${rank} ${name}`),
    ).toEqual(['6 Lior Katz', '7 Maya Gold']);
  });

  it("shows a played game's picks, who was right, and how the group split", async () => {
    const picks: GroupMemberPredictionDto[] = [
      {
        id: 'user-dana',
        name: 'Dana Levi',
        picked: true,
        pick: PredictionPick.HOME,
      },
      { id: 'user-noam', name: 'Noam Bar', picked: false, pick: null },
      {
        id: 'user-omer',
        name: 'Omer Cohen',
        picked: true,
        pick: PredictionPick.AWAY,
      },
    ];
    stubApi(
      routes(friday, {
        [`GET /groups/${ID}/games/${played.id}/predictions`]: picks,
      }),
    );
    renderAt(`/groups/${ID}`);

    const dialog = await openPredictions(0);

    expect(
      within(dialog).getByText(
        'Predictions: New York Knicks at Boston Celtics',
      ),
    ).toBeTruthy();
    expect(
      await within(dialog).findByRole('table', {
        name: "Members' predictions",
      }),
    ).toBeTruthy();
    expect(
      cellsOf(
        within(dialog).getByRole('table', { name: "Members' predictions" }),
      ),
    ).toEqual([
      ['Dana Levi', 'Boston Celtics', 'Right'],
      ['Noam Bar', 'None', 'N/A'],
      ['Omer Cohen', 'New York Knicks', 'Wrong'],
    ]);
    // Picked, then each team's share (away first), then the right ones.
    expect(
      within(dialog)
        .getAllByRole('definition')
        .map((value) => value.textContent),
    ).toEqual(['2 of 3', '1 (50.0%)', '1 (50.0%)', '1 (50.0%)']);
  });

  it("shows only who picked a game that hasn't begun", async () => {
    stubApi(
      routes(friday, {
        [`GET /groups/${ID}/games/${upcoming.id}/predictions`]: [
          { id: 'user-dana', name: 'Dana Levi', picked: true, pick: null },
          { id: 'user-omer', name: 'Omer Cohen', picked: false, pick: null },
        ],
      }),
    );
    renderAt(`/groups/${ID}`);

    const dialog = await openPredictions(1);

    expect(
      cellsOf(
        await within(dialog).findByRole('table', {
          name: "Members' predictions",
        }),
      ),
    ).toEqual([
      ['Dana Levi', 'Picked', 'N/A'],
      ['Omer Cohen', 'None', 'N/A'],
    ]);
    expect(
      within(dialog).getByText(
        'Which team each member picked shows once the game begins.',
      ),
    ).toBeTruthy();
  });

  it("says when there's no such group, or it's private", async () => {
    stubApi(
      routes(friday, {
        [`GET /groups/${ID}`]: new Failure(404, {
          statusCode: 404,
          message: `Group ${ID} not found`,
        }),
      }),
    );
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
      members: [{ id: 'u1', name: 'Dana Levi', score: 0 }],
      memberCount: 1,
    };

    it("aren't there for a group the user doesn't own", async () => {
      stubApi(routes(friday));
      renderAt(`/groups/${ID}`);

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Friday League' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });

    it('Edit renames the group, then says so', async () => {
      const fetchMock = stubApi(
        routes(mine, {
          [`PATCH /groups/${ID}`]: { ...mine, name: 'Sunday League' },
        }),
      );
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
      const fetchMock = stubApi(
        routes(mine, { [`DELETE /groups/${ID}`]: undefined }),
      );
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
