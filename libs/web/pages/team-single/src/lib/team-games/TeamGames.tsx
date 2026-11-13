import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  IconButton,
  Link,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import { GameStatus, SeasonType } from '@nba/sql-games/enums';
import { formatDay, formatTime, useTeamGames } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableSort } from '@nba/web-table-components';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { OpponentStatsDialog } from '../opponent-stats-dialog/OpponentStatsDialog';

// A row's opponent, for its menu and the dialog the menu opens.
interface OpponentOf {
  gameId: string;
  opponentId: string;
  opponent: string;
}

// What sets a game apart from the regular season's; null for those.
const typeLabels: Record<SeasonType, string | null> = {
  [SeasonType.PRESEASON]: 'Preseason',
  [SeasonType.REGULAR]: null,
  [SeasonType.CUP_FINAL]: 'Cup Final',
  [SeasonType.PLAY_IN]: 'Play-In',
  [SeasonType.CONFERENCE_TOURNAMENT]: 'Tournament',
  [SeasonType.POSTSEASON]: 'Playoffs',
};

// W/L and the score once final, the score while on, the tip-off (the viewer's time) before, else what happened.
const resultOf = (
  game: GameDto,
  teamId: string,
  score: number | null,
  opponentScore: number | null,
): string => {
  if (score === null || opponentScore === null) {
    return game.status === GameStatus.SCHEDULED
      ? formatTime(game.startTime)
      : game.status.charAt(0).toUpperCase() + game.status.slice(1);
  }
  if (game.status !== GameStatus.FINAL) return `${score}-${opponentScore}`;
  return `${game.winnerTeamId === teamId ? 'W' : 'L'} ${score}-${opponentScore}`;
};

// A game from the team's side: where, against whom, and the score with the team's first.
const sideOf = (
  game: GameDto,
  teamId: string,
  teamNames: Map<string, string>,
) => {
  const isHome = game.homeTeamId === teamId;
  const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
  const [score, opponentScore] = isHome
    ? [game.homeScore, game.awayScore]
    : [game.awayScore, game.homeScore];
  return {
    game,
    isHome,
    opponentId,
    opponent: teamNames.get(opponentId) ?? opponentId,
    margin:
      score === null || opponentScore === null ? null : score - opponentScore,
    result: resultOf(game, teamId, score, opponentScore),
  };
};

// The team's games in the season, by day.
export function TeamGames({
  teamId,
  season,
  teamNames,
}: {
  teamId: string;
  season: number | undefined;
  teamNames: Map<string, string>;
}) {
  const { data: games, isError } = useTeamGames(teamId, season);
  const { rows, headCell } = useTableSort(
    (games ?? []).map((game) => sideOf(game, teamId, teamNames)),
    {
      date: (row) => row.game.startTime,
      opponent: (row) => row.opponent,
      result: (row) => row.margin,
    },
  );
  const [menu, setMenu] = useState<
    (OpponentOf & { anchor: HTMLElement }) | null
  >(null);
  const [stats, setStats] = useState<OpponentOf | null>(null);
  if (season === undefined) {
    return <Typography color="text.secondary">No season yet.</Typography>;
  }
  if (!games) return <PageLoader error={isError} />;
  if (games.length === 0) {
    return (
      <Typography color="text.secondary">No games this season.</Typography>
    );
  }

  return (
    <TableContainer>
      <Table aria-label="Games">
        <TableHead>
          <TableRow>
            {headCell('date', 'Date')}
            {headCell('opponent', 'Opponent')}
            {headCell('result', 'Result', 'right')}
            <TableCell aria-label="Actions" />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ game, isHome, opponentId, opponent, result }) => (
            <TableRow key={game.id}>
              <TableCell>{formatDay(game.date)}</TableCell>
              <TableCell>
                {isHome ? 'vs ' : '@ '}
                <Link component={RouterLink} to={`/teams/${opponentId}`}>
                  {opponent}
                </Link>
                {typeLabels[game.seasonType] && (
                  <Typography component="span" color="text.secondary">
                    {' · '}
                    {typeLabels[game.seasonType]}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right">{result}</TableCell>
              <TableCell align="right" sx={{ py: 0 }}>
                <IconButton
                  className="row-menu"
                  aria-label="Actions"
                  aria-haspopup="menu"
                  aria-expanded={menu?.gameId === game.id}
                  onClick={(event) =>
                    setMenu({
                      gameId: game.id,
                      opponentId,
                      opponent,
                      anchor: event.currentTarget,
                    })
                  }
                >
                  <MoreVertIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          onClick={() => {
            setStats(menu);
            setMenu(null);
          }}
        >
          Statistics
        </MenuItem>
      </Menu>
      {stats && (
        <OpponentStatsDialog
          teamId={teamId}
          opponentId={stats.opponentId}
          opponent={stats.opponent}
          onClose={() => setStats(null)}
        />
      )}
    </TableContainer>
  );
}
