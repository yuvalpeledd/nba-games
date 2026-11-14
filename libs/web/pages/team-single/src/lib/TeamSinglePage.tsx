import StadiumOutlinedIcon from '@mui/icons-material/StadiumOutlined';
import {
  Avatar,
  Chip,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import type { StandingDto } from '@nba/dtos-standings';
import {
  currentSeason,
  formatSeason,
  formatWinPct,
  statHints,
  useSeasons,
  useStandings,
  useTeams,
} from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useState } from 'react';
import { useParams } from 'react-router';
import { TeamGames } from './team-games/TeamGames';
import { TeamPlayers } from './team-players/TeamPlayers';
import './team-single-page.scss';

// The team's line in the season's standings: each stat's label, value and what it means.
const statsOf = (standing: StandingDto): [string, string, string][] => [
  ['Record', `${standing.wins}-${standing.losses}`, statHints.record],
  ['PCT', formatWinPct(standing.winPct), statHints.winPct],
  ['Seed', String(standing.conferenceRank), statHints.seed],
  ['Home', standing.homeRecord, statHints.home],
  ['Away', standing.awayRecord, statHints.away],
  ['L10', standing.last10, statHints.last10],
  ['Streak', standing.streak, statHints.streak],
];

// A team (/teams/:id): what we know of it, its current season's standing, and tabs for its games and its roster.
export function TeamSinglePage() {
  const { id } = useParams() as { id: string };
  const teams = useTeams();
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  // ponytail: the standing shows once it loads and is left out if it fails: the rest of the page doesn't need it.
  const standings = useStandings(season?.year);
  const [tab, setTab] = useState<'games' | 'players'>('games');
  if (!teams.data || !seasons.data) {
    return <PageLoader error={teams.isError || seasons.isError} />;
  }
  const team = teams.data.find((row) => row.id === id);
  if (!team) {
    return (
      <Stack spacing={3}>
        <Typography variant="h1">Team not found</Typography>
        <Typography color="text.secondary">There's no team {id}.</Typography>
      </Stack>
    );
  }
  const standing = standings.data?.find((row) => row.teamId === id);
  const teamNames = new Map(teams.data.map((row) => [row.id, row.name]));

  return (
    <Stack spacing={3}>
      <section className="team-single-page__hero">
        <div className="team-single-page__identity">
          <Avatar className="team-single-page__badge">
            {team.abbreviation}
          </Avatar>
          <div className="team-single-page__name">
            <Typography variant="h1">{team.name}</Typography>
            <div className="team-single-page__facts">
              <Chip size="small" label={`${team.conference} Conference`} />
              <Chip size="small" label={`${team.division} Division`} />
              <Chip
                size="small"
                variant="outlined"
                icon={<StadiumOutlinedIcon />}
                label={`${team.venue.name}, ${team.venue.city}`}
              />
            </div>
          </div>
        </div>
        {season && standing && (
          <div className="team-single-page__season">
            <Typography variant="h2">{formatSeason(season.year)}</Typography>
            <dl className="team-single-page__stats">
              {statsOf(standing).map(([label, value, hint]) => (
                <div key={label} className="team-single-page__stat">
                  <Tooltip title={hint} describeChild>
                    <dt>{label}</dt>
                  </Tooltip>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
      <Tabs value={tab} onChange={(_, next) => setTab(next)}>
        <Tab value="games" label="Games" />
        <Tab value="players" label="Players" />
      </Tabs>
      {tab === 'games' ? (
        <TeamGames teamId={id} season={season?.year} teamNames={teamNames} />
      ) : (
        <TeamPlayers teamId={id} />
      )}
    </Stack>
  );
}
