import type { GameCreateObject } from '@nba/sql-games';
import type { PlayerCreateObject } from '@nba/sql-players';
import type { TeamCreateObject } from '@nba/sql-teams';

// API Ninjas' responses, the fields we read (https://api-ninjas.com/api/nba). `fixtures.ts` holds real ones, typed by
// these, so a field they get wrong fails the type check.

export interface ApiTeamRef {
  team_id: string;
  name: string;
  abbreviation: string;
}

// GET /v1/basketballteams
export interface ApiTeam {
  team_id: string;
  abbreviation: string;
  name: string;
  nickname: string;
  city: string;
  conference: string;
  division: string;
  venue: TeamCreateObject['venue'];
  active: boolean;
}

// GET /v1/basketballplayers
export interface ApiPlayer {
  player_id: string;
  team: ApiTeamRef | null;
  name: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: string | null;
  height_in: number | null;
  weight_lb: number | null;
  birth_date: string | null;
  birth_place: PlayerCreateObject['birthPlace'];
  roster_status: string;
  // Left out, not null, for players who didn't go to college.
  college?: string | null;
  experience_years: number | null;
}

// GET /v1/basketballgames
export interface ApiGame {
  game_id: string;
  season: number;
  season_type: string;
  date: string;
  start_time: string;
  status: string;
  status_detail: string | null;
  period: number | null;
  clock: string | null;
  home_team: ApiTeamRef;
  away_team: ApiTeamRef;
  home_score: number | null;
  away_score: number | null;
  period_scores: GameCreateObject['periodScores'];
  decided_in: string | null;
  winner: string | null;
  venue: GameCreateObject['venue'];
  neutral_site: boolean;
  original_date: string | null;
}

// GET /v1/basketballstandings
export interface ApiStanding {
  season: number;
  team: ApiTeamRef;
  conference: string;
  division: string;
  games_played: number;
  wins: number;
  losses: number;
  win_pct: number;
  games_behind: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  streak: string;
  home_record: string;
  away_record: string;
  division_record: string;
  conference_record: string;
  last_10: string;
  league_rank: number;
  conference_rank: number;
  division_rank: number;
  final: boolean;
}
