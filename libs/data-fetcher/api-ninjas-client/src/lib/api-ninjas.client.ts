import { Injectable } from '@nestjs/common';
import type { GameCreateObject } from '@nba/sql-games';
import type { PlayerCreateObject } from '@nba/sql-players';
import type { StandingCreateObject } from '@nba/sql-standings';
import type { TeamCreateObject } from '@nba/sql-teams';
import type {
  ApiGame,
  ApiPlayer,
  ApiStanding,
  ApiTeam,
} from './api-ninjas.types';
import { gameOf, playerOf, standingOf, teamOf } from './mappers';

const BASE_URL = 'https://api.api-ninjas.com/v1/';
const TIMEOUT_MS = 30_000;

// A refused call: `status` 429 is the plan's quota (per hour or per month).
export class ApiNinjasError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// The only code that calls API Ninjas: each method is one request, its answer mapped to our rows. No retries: a
// failed fetch is redone by the next run (data-fetcher.md).
// ponytail: one page per request; the provider's default page covers a roster and a day's games (30 teams come back
// in one). Page with `offset` if a response ever comes back cut.
@Injectable()
export class ApiNinjasClient {
  private readonly key = process.env['API_NINJAS_KEY'];

  constructor() {
    if (!this.key) throw new Error('API_NINJAS_KEY is not set');
  }

  async teams(): Promise<TeamCreateObject[]> {
    return (await this.get<ApiTeam>('basketballteams')).map(teamOf);
  }

  // A team's roster, by its id (`nba-por`).
  async players(teamId: string): Promise<PlayerCreateObject[]> {
    return (
      await this.get<ApiPlayer>('basketballplayers', { team: teamId })
    ).map(playerOf);
  }

  // A day's games ('YYYY-MM-DD', the league's US Eastern day).
  async games(date: string): Promise<GameCreateObject[]> {
    return (await this.get<ApiGame>('basketballgames', { date })).map(gameOf);
  }

  // The current season's.
  async standings(): Promise<StandingCreateObject[]> {
    return (await this.get<ApiStanding>('basketballstandings')).map(standingOf);
  }

  private async get<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T[]> {
    const url = new URL(path, BASE_URL);
    url.search = new URLSearchParams({ league: 'nba', ...params }).toString();
    const response = await fetch(url, {
      headers: { 'X-Api-Key': this.key as string },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 200);
      throw new ApiNinjasError(
        response.status,
        `GET ${path} answered ${response.status}: ${body}`,
      );
    }
    return (await response.json()) as T[];
  }
}
