/* eslint-disable @typescript-eslint/no-explicit-any -- JSON response bodies */
import {
  Abstract,
  INestApplication,
  ModuleMetadata,
  Type,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { FailureFilter } from '@nba/frontend-api-common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TEST_DB_NAME, testPostgresOptions } from '@nba/sql';
import { GameCreateObject, GameDalService, GameModule } from '@nba/sql-games';
import {
  PlayerCreateObject,
  PlayerDalService,
  PlayerModule,
} from '@nba/sql-players';
import {
  SeasonCreateObject,
  SeasonEntity,
  SeasonModule,
} from '@nba/sql-seasons';
import {
  StandingCreateObject,
  StandingDalService,
  StandingModule,
} from '@nba/sql-standings';
import { TeamPlayerDalService, TeamPlayerModule } from '@nba/sql-team-players';
import { TeamCreateObject, TeamDalService, TeamModule } from '@nba/sql-teams';
import { DataSource } from 'typeorm';
import {
  generateGame,
  generatePlayer,
  generateSeason,
  generateStanding,
  generateTeam,
} from './generators';

export interface Reply {
  status: number;
  body: any;
}

// The modules under test, as main.ts serves them (under /api, with the failure filter), over HTTP on a random port,
// on the specs' database (TEST_DB_NAME) rebuilt through the migrations (testPostgresOptions). Every table's DAL module is loaded, for seeding
// and reading back.
export class TestApp {
  private constructor(
    private readonly app: INestApplication,
    private readonly baseUrl: string,
  ) {}

  static async create(
    imports: NonNullable<ModuleMetadata['imports']>,
  ): Promise<TestApp> {
    // clearDatabase() empties whatever it's connected to: never let it near a developer's data.
    if (process.env['NODE_ENV'] !== 'test') {
      throw new Error('TestApp runs only under Jest (NODE_ENV=test)');
    }
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({ useFactory: testPostgresOptions }),
        TeamModule,
        PlayerModule,
        TeamPlayerModule,
        GameModule,
        StandingModule,
        SeasonModule,
        ...imports,
      ],
      providers: [{ provide: APP_FILTER, useClass: FailureFilter }],
    }).compile();
    const app = moduleRef.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api');
    await app.listen(0);
    return new TestApp(app, await app.getUrl());
  }

  get<T>(type: Type<T> | Abstract<T>): T {
    return this.app.get(type);
  }

  // `path` is under /api: `app.call('GET', '/teams')`.
  async call(method: string, path: string, body?: unknown): Promise<Reply> {
    const response = await fetch(`${this.baseUrl}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

  // Empties every table, seasons included (their migration's rows too); the schema and the applied migrations stay.
  async clearDatabase(): Promise<void> {
    const dataSource = this.get(DataSource);
    if (dataSource.options.database !== TEST_DB_NAME) {
      throw new Error(`Not clearing ${dataSource.options.database}`);
    }
    const tables = dataSource.entityMetadatas.map(
      ({ tableName }) => `"${tableName}"`,
    );
    await dataSource.query(`TRUNCATE ${tables.join(', ')} CASCADE`);
  }

  close(): Promise<void> {
    return this.app.close();
  }

  async createTeam(
    overrides?: Partial<TeamCreateObject>,
  ): Promise<TeamCreateObject> {
    const team = generateTeam(overrides);
    await this.get(TeamDalService).upsert([{ ...team }]);
    return team;
  }

  async createPlayer(
    teamId: string | null,
    overrides?: Partial<PlayerCreateObject>,
  ): Promise<PlayerCreateObject> {
    const player = generatePlayer(teamId, overrides);
    await this.get(PlayerDalService).upsert([{ ...player }]);
    return player;
  }

  // The player on the team's roster on each of `dates` ('YYYY-MM-DD').
  async addToRoster(
    teamId: string,
    playerId: string,
    dates: string[],
  ): Promise<void> {
    await this.get(TeamPlayerDalService).upsert(
      dates.map((date) => ({ date, teamId, playerId })),
    );
  }

  async createGame(
    homeTeamId: string,
    awayTeamId: string,
    overrides?: Partial<GameCreateObject>,
  ): Promise<GameCreateObject> {
    const game = generateGame(homeTeamId, awayTeamId, overrides);
    await this.get(GameDalService).upsert([{ ...game }]);
    return game;
  }

  async createStanding(
    season: number,
    teamId: string,
    overrides?: Partial<StandingCreateObject>,
  ): Promise<StandingCreateObject> {
    const standing = generateStanding(season, teamId, overrides);
    await this.get(StandingDalService).upsert([{ ...standing }]);
    return standing;
  }

  // As a migration loads one (the DAL is read-only).
  async createSeason(
    year: number,
    overrides?: Partial<SeasonCreateObject>,
  ): Promise<SeasonCreateObject> {
    const season = generateSeason(year, overrides);
    await this.get(DataSource)
      .getRepository<SeasonEntity>('seasons')
      .insert({ ...season });
    return season;
  }
}
