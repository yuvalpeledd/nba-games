import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorCode } from '@nba/enums';
import { FailureFilter } from '@nba/frontend-api-common';
import { testPostgresOptions } from '@nba/sql';
import {
  type GameCreateObject,
  GameDalService,
  GameStatus,
  SeasonType,
} from '@nba/sql-games';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-scores';
import { PredictionDalService, PredictionPick } from '@nba/sql-predictions';
import { TeamDalService, TeamModule } from '@nba/sql-teams';
import { UserDalService, UserModule } from '@nba/sql-users';
import { DataSource } from 'typeorm';
import { ScoreManagerScoresModule } from './scores.module';

// Over HTTP, as main.ts serves it (under /api, with the failure filter), on the specs' database. No sign-in: it's
// internal. (TestApp is frontend-api's, with its Firebase guard.)
describe('ScoresController', () => {
  let app: INestApplication;
  let baseUrl: string;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({ useFactory: testPostgresOptions }),
        TeamModule,
        UserModule,
        ScoreManagerScoresModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: FailureFilter }],
    }).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    await app.listen(0);
    baseUrl = await app.getUrl();
  });
  afterAll(() => app.close());
  beforeEach(() =>
    app
      .get(DataSource)
      .query(
        'TRUNCATE teams, games, users, predictions, groups, group_members, group_user_scores CASCADE',
      ),
  );

  const check = async (gameId: string) => {
    const response = await fetch(`${baseUrl}/api/games/${gameId}/check`, {
      method: 'POST',
    });
    return { status: response.status, body: await response.json() };
  };

  // A game between two new teams, final with the home team winning unless `overrides` say otherwise.
  let next = 0;
  const createGame = async (overrides: Partial<GameCreateObject> = {}) => {
    const [home, away] = ['h', 'a'].map((side) => `nba-${side}${++next}`);
    await app.get(TeamDalService).upsert(
      [home, away].map((id) => ({
        id,
        abbreviation: id.slice(4).toUpperCase(),
        name: id,
        nickname: id,
        city: 'Test City',
        conference: 'Eastern',
        division: 'Atlantic',
        venue: {
          name: 'Arena',
          city: 'Test City',
          state: null,
          country: 'USA',
        },
        active: true,
      })),
    );
    const game: GameCreateObject = {
      id: `nba-20261111-${next}`,
      season: 2026,
      seasonType: SeasonType.REGULAR,
      date: '2026-11-11',
      startTime: new Date('2026-11-11T23:00:00Z'),
      status: GameStatus.FINAL,
      statusDetail: null,
      period: null,
      clock: null,
      homeTeamId: home,
      awayTeamId: away,
      homeScore: 110,
      awayScore: 100,
      periodScores: null,
      decidedIn: null,
      winnerTeamId: home,
      venue: null,
      neutralSite: false,
      originalDate: null,
      ...overrides,
    };
    await app.get(GameDalService).upsert([game]);
    return game;
  };

  const createUser = (name: string) =>
    app.get(UserDalService).create({
      name,
      email: `${name.toLowerCase()}@nba.dev`,
      firebaseUid: `firebase-${name}`,
    });

  // Owned by the first user, with the rest added (nothing in the API joins a group yet).
  const createGroup = async (name: string, ...userIds: string[]) => {
    const group = await app
      .get(GroupMemberDalService)
      .createGroup({ name, ownerId: userIds[0], public: false });
    await app
      .get(DataSource)
      .getRepository('group_members')
      .insert(
        userIds.slice(1).map((userId) => ({ groupId: group.id, userId })),
      );
    return group;
  };

  const pick = (userId: string, gameId: string, pick: PredictionPick | null) =>
    app.get(PredictionDalService).set({ userId, gameId, pick });

  const sorted = <T extends { groupId: string; userId: string }>(rows: T[]) =>
    rows.sort((a, b) =>
      `${a.groupId}${a.userId}`.localeCompare(`${b.groupId}${b.userId}`),
    );

  const scores = async (gameId: string) =>
    sorted(
      (await app.get(GroupUserScoreDalService).findByGame(gameId)).map(
        ({ groupId, userId, score }) => ({ groupId, userId, score }),
      ),
    );

  describe('POST /games/:gameId/check', () => {
    describe('validation', () => {
      it('takes a game id up to 100 characters', async () => {
        const { status, body } = await check('x'.repeat(101));
        expect(status).toBe(400);
        expect(body.message).toContain('gameId must be at most 100 characters');
      });
    });

    describe('behavior', () => {
      it('is 404 for an unknown game', async () => {
        const { status } = await check('nba-20261111-nope');
        expect(status).toBe(404);
      });

      it.each([GameStatus.SCHEDULED, GameStatus.CANCELED])(
        'refuses a %s game, without a winner',
        async (status) => {
          const game = await createGame({ status, winnerTeamId: null });
          const dana = await createUser('Dana');
          await createGroup('Friday League', dana.id);
          await pick(dana.id, game.id, PredictionPick.HOME);

          const reply = await check(game.id);

          expect(reply.status).toBe(409);
          expect(reply.body.code).toBe(ErrorCode.GAME_NOT_FINAL);
          expect(await scores(game.id)).toEqual([]);
        },
      );

      it("scores each pick 1 if right and 0 if wrong, in every group of the user's", async () => {
        const game = await createGame(); // the home team won
        const [dana, omer, noa, lior, eli] = await Promise.all(
          ['Dana', 'Omer', 'Noa', 'Lior', 'Eli'].map(createUser),
        );
        const league = await createGroup(
          'Friday League',
          dana.id,
          omer.id,
          noa.id,
          lior.id,
        );
        const office = await createGroup('Office', dana.id);
        await pick(dana.id, game.id, PredictionPick.HOME); // right
        await pick(omer.id, game.id, PredictionPick.AWAY); // wrong
        await pick(noa.id, game.id, null); // took it back: no score
        // lior made no pick: no score; eli is in no group: nowhere to score
        await pick(eli.id, game.id, PredictionPick.HOME);

        const { status, body } = await check(game.id);

        expect(status).toBe(200);
        expect(body.data).toEqual({ inserted: 3, updated: 0, unchanged: 0 });
        expect(await scores(game.id)).toEqual(
          sorted([
            { groupId: league.id, userId: dana.id, score: 1 },
            { groupId: office.id, userId: dana.id, score: 1 },
            { groupId: league.id, userId: omer.id, score: 0 },
          ]),
        );
      });

      it('rewrites only what changed when checked again', async () => {
        const game = await createGame();
        const [dana, omer] = await Promise.all(
          ['Dana', 'Omer'].map(createUser),
        );
        const league = await createGroup('Friday League', dana.id, omer.id);
        await pick(dana.id, game.id, PredictionPick.HOME);
        await pick(omer.id, game.id, PredictionPick.AWAY);
        await check(game.id);

        expect((await check(game.id)).body.data).toEqual({
          inserted: 0,
          updated: 0,
          unchanged: 2,
        });

        // The provider corrects the result: the away team won.
        await app
          .get(GameDalService)
          .upsert([{ ...game, winnerTeamId: game.awayTeamId }]);
        expect((await check(game.id)).body.data).toEqual({
          inserted: 0,
          updated: 2,
          unchanged: 0,
        });
        expect(await scores(game.id)).toEqual(
          sorted([
            { groupId: league.id, userId: dana.id, score: 0 },
            { groupId: league.id, userId: omer.id, score: 1 },
          ]),
        );
      });
    });
  });
});
