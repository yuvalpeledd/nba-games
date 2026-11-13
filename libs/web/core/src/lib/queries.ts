import type { StandingDto } from '@nba/dtos-standings';
import type { TeamDto } from '@nba/dtos-teams';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export const useTeams = () =>
  useQuery({ queryKey: ['teams'], queryFn: () => api<TeamDto[]>('/teams') });

export const useStandings = () =>
  useQuery({
    queryKey: ['standings'],
    queryFn: () => api<StandingDto[]>('/standings'),
  });
