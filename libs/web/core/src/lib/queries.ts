import type { SeasonDto } from '@nba/dtos-seasons';
import type { StandingDto } from '@nba/dtos-standings';
import type { TeamDto } from '@nba/dtos-teams';
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
