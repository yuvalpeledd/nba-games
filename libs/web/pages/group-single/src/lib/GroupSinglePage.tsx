import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import PublicIcon from '@mui/icons-material/Public';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import { DEFAULT_GAME_SCORE, isGameCompleted } from '@nba/dtos-groups';
import { GroupStatus } from '@nba/sql-groups/enums';
import {
  ApiError,
  currentSeason,
  formatSeason,
  useGroup,
  useJoinGroup,
  useLeaveGroup,
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

// A group (/groups/:id): what it is, its scoreboard, and, for its members, the season's games, each with what a
// right pick of it scores there and its members' picks a menu away. Its owner sets a game's score until it's
// completed, and edits or deletes the group; anyone else joins it, or leaves it once confirmed (deleting or leaving,
// it's back to /groups, which says so).
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
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
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
  const join = () =>
    joinGroup.mutate(id, {
      onSuccess: () => setToast(`You joined ${name}`),
      onError: () => setToast("Couldn't join the group, try again"),
    });
  const leave = () =>
    leaveGroup.mutate(id, {
      onSuccess: () =>
        navigate('/groups', { state: { toast: `You left ${name}` } }),
      onError: () => setToast("Couldn't leave the group, try again"),
    });
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
        <Stack spacing={1}>
          <Typography variant="h1">{name}</Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip
              size="small"
              icon={group.data.public ? <PublicIcon /> : <LockOutlinedIcon />}
              label={group.data.public ? 'Public' : 'Private'}
            />
            <Chip
              size="small"
              color={status === GroupStatus.ACTIVE ? 'success' : 'default'}
              label={status}
            />
            <Chip
              size="small"
              variant="outlined"
              icon={<PersonOutlinedIcon />}
              label={`Owned by ${owner.name}`}
            />
            {isMember && (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                icon={<CheckIcon />}
                label="You are a member"
              />
            )}
          </Stack>
        </Stack>
        {!isOwner && !isMember && (
          <Button
            variant="contained"
            startIcon={<GroupAddIcon />}
            onClick={join}
            loading={joinGroup.isPending}
          >
            Join
          </Button>
        )}
        {!isOwner && isMember && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={() => setIsLeaveOpen(true)}
          >
            Leave
          </Button>
        )}
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Games
          </Typography>
          {season && <Chip size="small" label={formatSeason(season.year)} />}
        </Stack>
        {!isMember ? (
          <Typography color="text.secondary">
            Join the group to see its games and its members' picks.
          </Typography>
        ) : (
          <GamesTable
            games={games.data ?? []}
            teams={teams.data}
            picks={
              new Map(
                predictions.data?.map(({ gameId, pick }) => [gameId, pick]),
              )
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
        )}
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
          gameScore={gameScoreOfGame(predictionsOf)}
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
      <Dialog open={isLeaveOpen} onClose={() => setIsLeaveOpen(false)}>
        <DialogTitle>Leave {name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {group.data.public
              ? "You won't see its games and its members' picks until you join again."
              : "It's private: you can't join it again."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLeaveOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={leave}
            loading={leaveGroup.isPending}
          >
            Leave
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Stack>
  );
}
