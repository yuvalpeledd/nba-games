import { INestApplication } from '@nestjs/common';
import { ErrorCode } from '@nba/enums';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { testPostgresOptions } from '@nba/sql';
import {
  GameDalService,
  GameModule,
  GameStatus,
  SeasonType,
} from '@nba/sql-games';
import {
  GroupGameScoreDalService,
  GroupGameScoreModule,
} from '@nba/sql-group-game-score';
import {
  GroupMemberDalService,
  GroupMemberModule,
} from '@nba/sql-group-members';
import {
  GroupUserScoreDalService,
  GroupUserScoreModule,
} from '@nba/sql-group-user-score';
import {
  PredictionDalService,
  PredictionModule,
  PredictionPick,
} from '@nba/sql-predictions';
import { GroupDalService, type GroupCreateObject } from '@nba/sql-groups';
import { TeamDalService, TeamModule } from '@nba/sql-teams';
import { UserDalService, UserModule } from '@nba/sql-users';
import { DataSource } from 'typeorm';
import { ScoreManagerScoresModule } from './scores.module';

// Over HTTP, as main.ts serves it (under /api), against the specs' database (TEST_DB_NAME).

const team = (abbreviation: string) => ({
  id: `nba-${abbreviation}`,
  abbreviation: abbreviation.toUpperCase(),
  name: abbreviation,
  nickname: abbreviation,
  city: 'Test City',
  conference: 'Eastern',
  division: 'Atlantic',
  venue: { name: 'Arena', city: 'Test City', state: 'NY', country: 'USA' },
  active: true,
});

// Boston at home to New York, final, Boston won.
const GAME_ID = 'nba-20261111-nyk-bos';
const finalGame = {
  id: GAME_ID,
  season: 2026,
  seasonType: SeasonType.REGULAR,
  date: '2026-11-11',
  startTime: new Date('2026-11-11T23:00:00Z'),
  status: GameStatus.FINAL,
  statusDetail: null,
  period: null,
  clock: null,
  homeTeamId: 'nba-bos',
  awayTeamId: 'nba-nyk',
  homeScore: 110,
  awayScore: 100,
  periodScores: null,
  decidedIn: null,
  winnerTeamId: 'nba-bos',
  venue: null,
  neutralSite: false,
  originalDate: null,
};

describe('ScoresController', () => {
  let app: INestApplication;
  let baseUrl: string;
  const get = <T>(type: new (...args: never[]) => T) => app.get(type);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({ useFactory: testPostgresOptions }),
        TeamModule,
        GameModule,
        UserModule,
        PredictionModule,
        GroupMemberModule,
        GroupUserScoreModule,
        GroupGameScoreModule,
        ScoreManagerScoresModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    await app.listen(0);
    baseUrl = await app.getUrl();
  });
  afterAll(() => app?.close());
  beforeEach(async () => {
    await get(DataSource).query(
      'TRUNCATE teams, games, users, predictions, groups, group_members, group_user_score, group_game_score CASCADE',
    );
    await get(TeamDalService).upsert([team('bos'), team('nyk')]);
  });

  const score = async (gameId: string) => {
    const response = await fetch(`${baseUrl}/api/games/${gameId}/score`, {
      method: 'POST',
    });
    return { status: response.status, body: await response.json() };
  };
  const createUser = (name: string) =>
    get(UserDalService).create({
      name,
      email: `${name}@nba.dev`,
      firebaseUid: `firebase-${name}`,
    });
  const createGroup = (
    name: string,
    ownerId: string,
    settings: Partial<GroupCreateObject> = {},
  ) =>
    get(GroupMemberDalService).createGroup({
      name,
      ownerId,
      public: true,
      ...settings,
    });
  const predict = (userId: string, pick: PredictionPick | null) =>
    get(PredictionDalService).set({ userId, gameId: GAME_ID, pick });

  describe('POST /games/score', () => {
    const scoreBetween = async (query: string) => {
      const response = await fetch(`${baseUrl}/api/games/score?${query}`, {
        method: 'POST',
      });
      return { status: response.status, body: await response.json() };
    };

    describe('validation', () => {
      it('requires from and to', async () => {
        const { status, body } = await scoreBetween('');
        expect(status).toBe(400);
        expect(body.message).toContain('from is a required field');
        expect(body.message).toContain('to is a required field');
      });

      it('takes real days', async () => {
        const { status, body } = await scoreBetween('from=2026-13-01&to=x');
        expect(status).toBe(400);
        expect(body.message).toContain('from must be a date (YYYY-MM-DD)');
        expect(body.message).toContain('to must be a date (YYYY-MM-DD)');
      });

      it('takes to on or after from', async () => {
        const { status, body } = await scoreBetween(
          'from=2026-11-12&to=2026-11-11',
        );
        expect(status).toBe(400);
        expect(body.message).toContain('to must not be before from');
      });
    });

    describe('behavior', () => {
      it('scores the final games in the range and skips the rest', async () => {
        const game = (id: string, date: string, overrides = {}) => ({
          ...finalGame,
          id,
          date,
          startTime: new Date(`${date}T23:00:00Z`),
          ...overrides,
        });
        await get(GameDalService).upsert([
          game('nba-20261110-nyk-bos', '2026-11-10'),
          game(GAME_ID, '2026-11-11'),
          game('nba-20261112-nyk-bos', '2026-11-12', {
            status: GameStatus.SCHEDULED,
            winnerTeamId: null,
          }),
          game('nba-20261113-nyk-bos', '2026-11-13'), // after the range
        ]);
        const dana = await createUser('dana');
        await createGroup('Friday', dana.id);
        await predict(dana.id, PredictionPick.HOME);

        const { status, body } = await scoreBetween(
          'from=2026-11-10&to=2026-11-12',
        );

        expect(status).toBe(200);
        expect(body).toEqual({
          data: [
            { gameId: 'nba-20261110-nyk-bos', scores: 0, right: 0 },
            { gameId: GAME_ID, scores: 1, right: 1 },
          ],
        });
        expect(
          await get(GroupUserScoreDalService).findByGame(GAME_ID),
        ).toMatchObject([{ userId: dana.id, score: 1 }]);
      });
    });
  });

  describe('POST /games/:gameId/score', () => {
    it('takes a game id up to 100 characters', async () => {
      const { status, body } = await score('x'.repeat(101));
      expect(status).toBe(400);
      expect(body.message).toContain('gameId must be at most 100 characters');
    });

    it('is 404 for an unknown game', async () => {
      expect((await score('nba-nope')).status).toBe(404);
    });

    it('is 409 until the game is final with a winner, and for a canceled one', async () => {
      for (const status of [GameStatus.SCHEDULED, GameStatus.CANCELED]) {
        await get(GameDalService).upsert([
          { ...finalGame, status, winnerTeamId: null },
        ]);
        const { status: code, body } = await score(GAME_ID);
        expect(code).toBe(409);
        expect(body.code).toBe(ErrorCode.GAME_NOT_FINAL);
      }
    });

    it("scores each pick 1 if right and 0 if wrong, in every group of its user's", async () => {
      await get(GameDalService).upsert([finalGame]);
      const dana = await createUser('dana');
      const omer = await createUser('omer');
      const noam = await createUser('noam'); // took their pick back
      const lone = await createUser('lone'); // in no group
      const friday = await createGroup('Friday', dana.id);
      const office = await createGroup('Office', omer.id);
      await get(GroupMemberDalService).join(office.id, dana.id);
      await get(GroupMemberDalService).join(office.id, noam.id);
      await predict(dana.id, PredictionPick.HOME);
      await predict(omer.id, PredictionPick.AWAY);
      await predict(noam.id, null);
      await predict(lone.id, PredictionPick.HOME);

      const { status, body } = await score(GAME_ID);

      expect(status).toBe(200);
      expect(body).toEqual({ data: { gameId: GAME_ID, scores: 3, right: 2 } });
      const rows = await get(GroupUserScoreDalService).findByGame(GAME_ID);
      expect(
        rows
          .map(({ groupId, userId, score }) => [groupId, userId, score])
          .sort(),
      ).toEqual(
        [
          [friday.id, dana.id, 1],
          [office.id, dana.id, 1],
          [office.id, omer.id, 0],
        ].sort(),
      );
    });

    it("scores a right pick the game's score in its group, where the owner set one", async () => {
      await get(GameDalService).upsert([finalGame]);
      const dana = await createUser('dana');
      const omer = await createUser('omer');
      const friday = await createGroup('Friday', dana.id);
      const office = await createGroup('Office', omer.id);
      await get(DataSource).query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [office.id, dana.id],
      );
      await get(GroupGameScoreDalService).set({
        groupId: office.id,
        gameId: GAME_ID,
        score: 3,
      });
      await predict(dana.id, PredictionPick.HOME);
      await predict(omer.id, PredictionPick.AWAY);

      const { body } = await score(GAME_ID);

      expect(body).toEqual({ data: { gameId: GAME_ID, scores: 3, right: 2 } });
      const rows = await get(GroupUserScoreDalService).findByGame(GAME_ID);
      expect(
        rows
          .map(({ groupId, userId, score }) => [groupId, userId, score])
          .sort(),
      ).toEqual(
        [
          [friday.id, dana.id, 1],
          [office.id, dana.id, 3],
          [office.id, omer.id, 0],
        ].sort(),
      );
    });

    it("scores a right pick the group's default score, and nothing in a group whose dates leave the game out", async () => {
      await get(GameDalService).upsert([finalGame]);
      const dana = await createUser('dana');
      const omer = await createUser('omer');
      const friday = await createGroup('Friday', dana.id, { defaultScore: 4 });
      // The game's day, 2026-11-11, is the group's last: it counts.
      const ending = await createGroup('Ending', omer.id, {
        startDate: '2026-11-01',
        endDate: '2026-11-11',
      });
      const later = await createGroup('Later', omer.id, {
        startDate: '2026-11-12',
      });
      const earlier = await createGroup('Earlier', omer.id, {
        endDate: '2026-11-10',
      });
      for (const group of [ending, later, earlier]) {
        await get(GroupMemberDalService).join(group.id, dana.id);
      }
      await predict(dana.id, PredictionPick.HOME);

      const { body } = await score(GAME_ID);

      expect(body.data).toEqual({ gameId: GAME_ID, scores: 2, right: 2 });
      const scores = await get(GroupUserScoreDalService).findByGame(GAME_ID);
      expect(
        scores.map(({ groupId, score }) => [groupId, score]).sort(),
      ).toEqual(
        [
          [friday.id, 4],
          [ending.id, 1],
        ].sort(),
      );
    });

    it('overwrites the scores when the game is scored again', async () => {
      await get(GameDalService).upsert([finalGame]);
      const dana = await createUser('dana');
      await createGroup('Friday', dana.id);
      await predict(dana.id, PredictionPick.HOME);
      await score(GAME_ID);

      // The provider corrected the result.
      await get(GameDalService).upsert([
        { ...finalGame, winnerTeamId: 'nba-nyk' },
      ]);
      await score(GAME_ID);

      expect(
        await get(GroupUserScoreDalService).findByGame(GAME_ID),
      ).toMatchObject([{ userId: dana.id, score: 0 }]);
    });
  });

  describe('POST /groups/:groupId/users/:userId/score', () => {
    const scoreMember = async (groupId: string, userId: string) => {
      const response = await fetch(
        `${baseUrl}/api/groups/${groupId}/users/${userId}/score`,
        { method: 'POST' },
      );
      return { status: response.status, body: await response.json() };
    };
    const UUID = '00000000-0000-4000-8000-000000000000';

    it('takes only uuids', async () => {
      const group = await scoreMember('nope', UUID);
      expect(group.status).toBe(400);
      expect(group.body.message).toContain('id must be a uuid');
      const user = await scoreMember(UUID, 'nope');
      expect(user.status).toBe(400);
      expect(user.body.message).toContain('userId must be a uuid');
    });

    it("is 404 for a user who isn't in the group", async () => {
      const dana = await createUser('dana');
      const omer = await createUser('omer');
      const friday = await createGroup('Friday', dana.id);
      expect((await scoreMember(friday.id, omer.id)).status).toBe(404);
    });

    it("scores the member's picks of final games in that group only", async () => {
      const later = 'nba-20261112-bos-nyk';
      await get(GameDalService).upsert([
        finalGame,
        // New York at home to Boston, final, Boston won: Omer picked New York.
        {
          ...finalGame,
          id: later,
          date: '2026-11-12',
          homeTeamId: 'nba-nyk',
          awayTeamId: 'nba-bos',
        },
        // Not played yet: nothing to score.
        {
          ...finalGame,
          id: 'nba-20261120-nyk-bos',
          date: '2026-11-20',
          status: GameStatus.SCHEDULED,
          winnerTeamId: null,
        },
      ]);
      const dana = await createUser('dana');
      const omer = await createUser('omer');
      const friday = await createGroup('Friday', dana.id);
      const office = await createGroup('Office', omer.id);
      await get(GroupMemberDalService).join(friday.id, omer.id);
      await predict(omer.id, PredictionPick.HOME);
      await get(PredictionDalService).set({
        userId: omer.id,
        gameId: later,
        pick: PredictionPick.HOME,
      });
      await get(PredictionDalService).set({
        userId: omer.id,
        gameId: 'nba-20261120-nyk-bos',
        pick: PredictionPick.HOME,
      });
      await predict(dana.id, PredictionPick.HOME);

      const { status, body } = await scoreMember(friday.id, omer.id);

      expect(status).toBe(200);
      expect(body).toEqual({
        data: { groupId: friday.id, members: 1, scores: 2, right: 1 },
      });
      const totals = await get(GroupUserScoreDalService).totalsByGroup(
        friday.id,
      );
      expect([...totals]).toEqual([[omer.id, 1]]);
      expect(
        (await get(GroupUserScoreDalService).totalsByGroup(office.id)).size,
      ).toBe(0);
    });

    it("scores a right pick the game's score in the group, where the owner set one", async () => {
      await get(GameDalService).upsert([finalGame]);
      const dana = await createUser('dana');
      const omer = await createUser('omer');
      const friday = await createGroup('Friday', dana.id);
      await get(GroupMemberDalService).join(friday.id, omer.id);
      await get(GroupGameScoreDalService).set({
        groupId: friday.id,
        gameId: GAME_ID,
        score: 3,
      });
      await predict(omer.id, PredictionPick.HOME);

      const { body } = await scoreMember(friday.id, omer.id);

      expect(body.data).toMatchObject({ scores: 1, right: 1 });
      expect(
        await get(GroupUserScoreDalService).findByGame(GAME_ID),
      ).toMatchObject([{ userId: omer.id, score: 3 }]);
    });
  });

  describe('POST /groups/:groupId/score', () => {
    const scoreGroup = async (groupId: string) => {
      const response = await fetch(`${baseUrl}/api/groups/${groupId}/score`, {
        method: 'POST',
      });
      return { status: response.status, body: await response.json() };
    };

    it('takes only a uuid', async () => {
      const { status, body } = await scoreGroup('nope');
      expect(status).toBe(400);
      expect(body.message).toContain('id must be a uuid');
    });

    it('is 404 for an unknown group', async () => {
      const { status } = await scoreGroup(
        '00000000-0000-4000-8000-000000000000',
      );
      expect(status).toBe(404);
    });

    it("rescores every member by the group's settings, dropping games its dates leave out", async () => {
      const earlier = 'nba-20261110-nyk-bos';
      await get(GameDalService).upsert([
        finalGame,
        { ...finalGame, id: earlier, date: '2026-11-10' },
      ]);
      const dana = await createUser('dana');
      const omer = await createUser('omer');
      const friday = await createGroup('Friday', dana.id);
      await get(GroupMemberDalService).join(friday.id, omer.id);
      for (const gameId of [GAME_ID, earlier]) {
        await get(PredictionDalService).set({
          userId: dana.id,
          gameId,
          pick: PredictionPick.HOME,
        });
      }
      await predict(omer.id, PredictionPick.AWAY);
      await scoreGroup(friday.id);
      expect([
        ...(await get(GroupUserScoreDalService).totalsByGroup(friday.id)),
      ]).toEqual(expect.arrayContaining([[dana.id, 2]]));

      // Its owner moves the start past the earlier game and makes a right pick worth 5.
      await get(GroupDalService).update(friday.id, {
        defaultScore: 5,
        startDate: '2026-11-11',
      });
      const { status, body } = await scoreGroup(friday.id);

      expect(status).toBe(200);
      expect(body.data).toEqual({
        groupId: friday.id,
        members: 2,
        scores: 2,
        right: 1,
      });
      const totals = await get(GroupUserScoreDalService).totalsByGroup(
        friday.id,
      );
      expect(totals.get(dana.id)).toBe(5);
      expect(totals.get(omer.id)).toBe(0);
      expect(await get(GroupUserScoreDalService).findByGame(earlier)).toEqual(
        [],
      );
    });
  });
});
