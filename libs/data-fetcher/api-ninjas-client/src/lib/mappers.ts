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

// The provider's fields → our rows. Its values are stored as they come (enums included: an unknown one fails the
// write, on the column's Postgres enum); the tables' NOT NULLs and foreign keys refuse what's missing.

export const teamOf = (t: ApiTeam): TeamCreateObject => ({
  id: t.team_id,
  abbreviation: t.abbreviation,
  name: t.name,
  nickname: t.nickname,
  city: t.city,
  conference: t.conference,
  division: t.division,
  venue: t.venue,
  active: t.active,
});

export const playerOf = (p: ApiPlayer): PlayerCreateObject => ({
  id: p.player_id,
  teamId: p.team?.team_id ?? null,
  name: p.name,
  firstName: p.first_name,
  lastName: p.last_name,
  position: p.position,
  jerseyNumber: p.jersey_number,
  heightIn: p.height_in,
  weightLb: p.weight_lb,
  birthDate: p.birth_date,
  birthPlace: p.birth_place,
  rosterStatus: p.roster_status,
  college: p.college ?? null,
  experienceYears: p.experience_years,
});

export const gameOf = (g: ApiGame): GameCreateObject => ({
  id: g.game_id,
  season: g.season,
  seasonType: g.season_type as GameCreateObject['seasonType'],
  date: g.date,
  startTime: new Date(g.start_time),
  status: g.status as GameCreateObject['status'],
  statusDetail: g.status_detail,
  period: g.period,
  clock: g.clock,
  homeTeamId: g.home_team.team_id,
  awayTeamId: g.away_team.team_id,
  homeScore: g.home_score,
  awayScore: g.away_score,
  periodScores: g.period_scores,
  decidedIn: g.decided_in,
  winnerTeamId: g.winner,
  venue: g.venue,
  neutralSite: g.neutral_site,
  originalDate: g.original_date,
});

export const standingOf = (s: ApiStanding): StandingCreateObject => ({
  season: s.season,
  teamId: s.team.team_id,
  conference: s.conference,
  division: s.division,
  gamesPlayed: s.games_played,
  wins: s.wins,
  losses: s.losses,
  winPct: s.win_pct,
  gamesBehind: s.games_behind,
  pointsFor: s.points_for,
  pointsAgainst: s.points_against,
  pointDifferential: s.point_differential,
  streak: s.streak,
  homeRecord: s.home_record,
  awayRecord: s.away_record,
  divisionRecord: s.division_record,
  conferenceRecord: s.conference_record,
  last10: s.last_10,
  leagueRank: s.league_rank,
  conferenceRank: s.conference_rank,
  divisionRank: s.division_rank,
  final: s.final,
});
