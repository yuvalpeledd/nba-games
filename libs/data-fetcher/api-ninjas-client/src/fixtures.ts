// For specs only (@nba/data-fetcher-api-ninjas-client/fixtures): API Ninjas' real responses to the Postman
// collection's requests, made on 2026-11-13. Typed by our response types, so a field they get wrong fails the type check.
import type {
  ApiGame,
  ApiPlayer,
  ApiStanding,
  ApiTeam,
} from './lib/api-ninjas.types';
import gamesJson from './fixtures/games.json';
import playersJson from './fixtures/players.json';
import standingsJson from './fixtures/standings.json';
import teamsJson from './fixtures/teams.json';

// The 30 teams.
export const teams: ApiTeam[] = teamsJson;
// Portland's roster (`team=nba-por`): 17 players, 5 without `college`.
export const players: ApiPlayer[] = playersJson;
// 2026-11-11's 10 games, all final.
export const games: ApiGame[] = gamesJson;
// 2026-27's, 13 games in.
export const standings: ApiStanding[] = standingsJson;
