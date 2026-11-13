import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import {
  ApiError,
  currentSeason,
  formatSeason,
  useGroup,
  usePredictions,
  useSeasonGames,
  useSeasons,
  useTeams,
} from '@nba/web-core';
import { GamesTable } from '@nba/web-predictions-components';
import { PageLoader } from '@nba/web-shell-components';
import { useState } from 'react';
import { useParams } from 'react-router';
import { GroupPredictionsDialog } from './group-predictions-dialog/GroupPredictionsDialog';
import { Scoreboard } from './scoreboard/Scoreboard';

// A group (/groups/:id): what it is, its scoreboard, and the season's games, each with its members' picks a menu away.
export function GroupSinglePage() {
  const { id } = useParams() as { id: string };
  const group = useGroup(id);
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  const teams = useTeams();
  const games = useSeasonGames(season?.year);
  const predictions = usePredictions(season?.year);
  const [menu, setMenu] = useState<{
    game: GameDto;
    anchor: HTMLElement;
  } | null>(null);
  const [predictionsOf, setPredictionsOf] = useState<GameDto | null>(null);
  // A bad id (400) or a group the user may not see (404) both read as not found.
  if (group.error instanceof ApiError && group.error.status < 500) {
    return (
      <Stack spacing={3}>
        <Typography variant="h1">Group not found</Typography>
        <Typography color="text.secondary">
          There's no group here, or it's private.
        </Typography>
      </Stack>
    );
  }
  // No season at all: no games to wait for.
  if (!group.data || !seasons.data || (season && !games.data) || !teams.data) {
    const isError =
      group.isError || seasons.isError || games.isError || teams.isError;
    return <PageLoader error={isError} />;
  }
  const { name, owner, status, members, isMember } = group.data;
  const nameOf = (teamId: string) =>
    teams.data.find((team) => team.id === teamId)?.name ?? teamId;

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h1">{name}</Typography>
        <Typography color="text.secondary">
          {group.data.public ? 'Public' : 'Private'} · {status} · Owned by{' '}
          {owner.name}
          {isMember && ' · You are a member'}
        </Typography>
      </div>
      <Box component="section" aria-label="Scoreboard">
        <Typography variant="h6" component="h2">
          Scoreboard ({members.length} members)
        </Typography>
        <Scoreboard members={members} ownerId={owner.id} />
      </Box>
      <Box component="section" aria-label="Games">
        <Typography variant="h6" component="h2">
          Games{season && ` · ${formatSeason(season.year)}`}
        </Typography>
        <GamesTable
          games={games.data ?? []}
          teams={teams.data}
          picks={
            new Map(predictions.data?.map(({ gameId, pick }) => [gameId, pick]))
          }
          actions={(game) => (
            <IconButton
              className="row-menu"
              aria-label="Actions"
              aria-haspopup="menu"
              aria-expanded={menu?.game.id === game.id}
              onClick={(event) =>
                setMenu({ game, anchor: event.currentTarget })
              }
            >
              <MoreVertIcon />
            </IconButton>
          )}
        />
      </Box>
      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          onClick={() => {
            setPredictionsOf(menu?.game ?? null);
            setMenu(null);
          }}
        >
          Predictions
        </MenuItem>
      </Menu>
      {predictionsOf && (
        <GroupPredictionsDialog
          groupId={id}
          game={predictionsOf}
          away={nameOf(predictionsOf.awayTeamId)}
          home={nameOf(predictionsOf.homeTeamId)}
          onClose={() => setPredictionsOf(null)}
        />
      )}
    </Stack>
  );
}
