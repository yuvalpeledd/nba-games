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
      'TRUNCATE teams, games, users, predictions, groups, group_members, group_user_score CASCADE',
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
  const createGroup = (name: string, ownerId: string) =>
    get(GroupMemberDalService).createGroup({ name, ownerId, public: true });
  const predict = (userId: string, pick: PredictionPick | null) =>
    get(PredictionDalService).set({ userId, gameId: GAME_ID, pick });

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
      // ponytail: joining has no DAL yet; the test inserts the memberships itself.
      await get(DataSource).query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2), ($1, $3)',
        [office.id, dana.id, noam.id],
      );
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
});
