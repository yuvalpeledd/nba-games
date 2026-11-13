import type { GameDto } from '@nba/dtos-games';
import type { PlayerDto } from '@nba/dtos-players';
import type { SeasonDto } from '@nba/dtos-seasons';
import type { StandingDto } from '@nba/dtos-standings';
import type { TeamDto } from '@nba/dtos-teams';
import { GameStatus } from '@nba/sql-games/enums';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

// Newest first.
export const useSeasons = () =>
  useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<SeasonDto[]>('/seasons'),
  });

// Every team, past franchises included (`active` false), by name.
export const useTeams = () =>
  useQuery({ queryKey: ['teams'], queryFn: () => api<TeamDto[]>('/teams') });

// A season's, by its year (SeasonDto.year); waits for one.
export const useStandings = (season: number | undefined) =>
  useQuery({
    queryKey: ['standings', season],
    queryFn: () => api<StandingDto[]>(`/standings?season=${season}`),
    enabled: season !== undefined,
  });

// Every team's games on a league day ('YYYY-MM-DD', US Eastern), by tip-off; refetched each minute while one is live.
export const useGames = (date: string) =>
  useQuery({
    queryKey: ['games', { date }],
    queryFn: () => api<GameDto[]>(`/games?from=${date}`),
    refetchInterval: ({ state }) =>
      state.data?.some(({ status }) => status === GameStatus.IN_PROGRESS)
        ? 60_000
        : false,
  });

// A team's games in a season (by its year), preseason and playoffs too, by day; waits for a season.
export const useTeamGames = (teamId: string, season: number | undefined) =>
  useQuery({
    queryKey: ['games', { teamId, season }],
    queryFn: () => api<GameDto[]>(`/games?season=${season}&teamId=${teamId}`),
    enabled: season !== undefined,
  });

// Every game between two teams, either at home, every season and type, by day.
export const useHeadToHead = (teamId: string, opponentId: string) =>
  useQuery({
    queryKey: ['games', { teamId, opponentId }],
    queryFn: () =>
      api<GameDto[]>(`/games?teamId=${teamId}&opponentId=${opponentId}`),
  });

// A team's current roster, by name.
// ponytail: the API's default page (50) covers a roster (~20); page it if that ever changes.
export const useTeamPlayers = (teamId: string) =>
  useQuery({
    queryKey: ['players', { teamId }],
    queryFn: () => api<PlayerDto[]>(`/players?teamId=${teamId}`),
  });
