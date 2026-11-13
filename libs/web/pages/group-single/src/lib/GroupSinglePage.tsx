import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import { DEFAULT_GAME_SCORE, isGameCompleted } from '@nba/dtos-groups';
import {
  ApiError,
  currentSeason,
  formatSeason,
  useGroup,
  usePredictions,
  useSeasonGames,
  useSeasons,
  useSession,
  useTeams,
} from '@nba/web-core';
import { DeleteGroupDialog, GroupDialog } from '@nba/web-groups-components';
import { GamesTable } from '@nba/web-predictions-components';
import { PageLoader } from '@nba/web-shell-components';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GameScoreDialog } from './game-score-dialog/GameScoreDialog';
import { GroupPredictionsDialog } from './group-predictions-dialog/GroupPredictionsDialog';
import { Scoreboard } from './scoreboard/Scoreboard';

// A group (/groups/:id): what it is, its scoreboard, and the season's games, each with what a right pick of it scores
// there and its members' picks a menu away; its owner sets a game's score until it's completed, and edits or deletes
// the group (then it's back to /groups, which says so).
// ponytail: its own snackbar, as the groups page's, until an app-wide toast exists.
export function GroupSinglePage() {
  const { id } = useParams() as { id: string };
  const group = useGroup(id);
  const userId = useSession()?.userId;
  const navigate = useNavigate();
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  const teams = useTeams();
  const games = useSeasonGames(season?.year);
  const predictions = usePredictions(season?.year);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    game: GameDto;
    anchor: HTMLElement;
  } | null>(null);
  const [predictionsOf, setPredictionsOf] = useState<GameDto | null>(null);
  const [gameScoreOf, setGameScoreOf] = useState<GameDto | null>(null);
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
  const isOwner = owner.id === userId;
  const nameOf = (teamId: string) =>
    teams.data.find((team) => team.id === teamId)?.name ?? teamId;
  const titleOf = (game: GameDto) =>
    `${nameOf(game.awayTeamId)} at ${nameOf(game.homeTeamId)}`;
  const gameScores = new Map(
    group.data.gameScores.map(({ gameId, score }) => [gameId, score]),
  );
  const gameScoreOfGame = (game: GameDto) =>
    gameScores.get(game.id) ?? DEFAULT_GAME_SCORE;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <div>
          <Typography variant="h1">{name}</Typography>
          <Typography color="text.secondary">
            {group.data.public ? 'Public' : 'Private'} · {status} · Owned by{' '}
            {owner.name}
            {isMember && ' · You are a member'}
          </Typography>
        </div>
        {isOwner && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete
            </Button>
          </Stack>
        )}
      </Stack>
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
          gameScore={gameScoreOfGame}
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
        {isOwner && menu && !isGameCompleted(menu.game) && (
          <MenuItem
            onClick={() => {
              setGameScoreOf(menu.game);
              setMenu(null);
            }}
          >
            Set game score
          </MenuItem>
        )}
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
      {gameScoreOf && (
        <GameScoreDialog
          groupId={id}
          gameId={gameScoreOf.id}
          title={titleOf(gameScoreOf)}
          score={gameScoreOfGame(gameScoreOf)}
          onClose={() => setGameScoreOf(null)}
          toast={setToast}
        />
      )}
      {isEditOpen && (
        <GroupDialog
          group={group.data}
          onClose={() => setIsEditOpen(false)}
          toast={setToast}
        />
      )}
      {isDeleteOpen && (
        <DeleteGroupDialog
          group={group.data}
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={(message) =>
            navigate('/groups', { state: { toast: message } })
          }
          toast={setToast}
        />
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Stack>
  );
}
