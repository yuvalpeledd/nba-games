import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import { GameStatus } from '@nba/sql-games/enums';
import {
  formatSeason,
  formatTime,
  formatWinPct,
  statHints,
  useHeadToHead,
} from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableSort } from '@nba/web-table-components';

// A final from the team's side.
const sideOf = (game: GameDto, teamId: string) => {
  const isHome = game.homeTeamId === teamId;
  const [score, opponentScore] = (
    isHome ? [game.homeScore, game.awayScore] : [game.awayScore, game.homeScore]
  ) as [number, number];
  const won = game.winnerTeamId === teamId;
  return {
    game,
    isHome,
    won,
    margin: score - opponentScore,
    result: `${won ? 'W' : 'L'} ${score}-${opponentScore}`,
  };
};

type Side = ReturnType<typeof sideOf>;

// Games played and the share won, at home or away: label, value, hint.
const recordOf = (
  sides: Side[],
  isHome: boolean,
): [string, string, string][] => {
  const played = sides.filter((side) => side.isHome === isHome);
  const wins = played.filter((side) => side.won).length;
  const winRate = played.length ? formatWinPct(wins / played.length) : '—';
  return isHome
    ? [
        ['Home games', String(played.length), statHints.homeGames],
        ['Home win rate', winRate, statHints.homeWinRate],
      ]
    : [
        ['Away games', String(played.length), statHints.awayGames],
        ['Away win rate', winRate, statHints.awayWinRate],
      ];
};

// The team's finals against an opponent, every season: its record at home and away, then each game, newest first.
export function OpponentStatsDialog({
  teamId,
  opponentId,
  opponent,
  onClose,
}: {
  teamId: string;
  opponentId: string;
  opponent: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: games, isError } = useHeadToHead(teamId, opponentId);
  const sides = (games ?? [])
    .filter((game) => game.status === GameStatus.FINAL)
    .map((game) => sideOf(game, teamId))
    .reverse();
  const { rows, headCell } = useTableSort(sides, {
    season: (row) => row.game.season,
    time: (row) => row.game.startTime,
    where: (row) => (row.isHome ? 'Home' : 'Away'),
    result: (row) => row.margin,
  });

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth>
      <DialogTitle>Against {opponent}</DialogTitle>
      <DialogContent>
        {!games ? (
          <PageLoader error={isError} />
        ) : sides.length === 0 ? (
          <Typography color="text.secondary">
            No games against them yet.
          </Typography>
        ) : (
          <Stack spacing={3}>
            <Stack
              component="dl"
              direction="row"
              sx={{ m: 0, flexWrap: 'wrap', columnGap: 4, rowGap: 2 }}
            >
              {[...recordOf(sides, true), ...recordOf(sides, false)].map(
                ([label, value, hint]) => (
                  <Box key={label}>
                    <Tooltip title={hint} describeChild>
                      <Typography
                        component="dt"
                        variant="caption"
                        color="text.secondary"
                      >
                        {label}
                      </Typography>
                    </Tooltip>
                    <Typography component="dd" sx={{ m: 0 }}>
                      {value}
                    </Typography>
                  </Box>
                ),
              )}
            </Stack>
            <TableContainer>
              <Table aria-label="Previous games">
                <TableHead>
                  <TableRow>
                    {headCell('season', 'Season')}
                    {headCell('time', 'Time')}
                    {headCell('where', 'Where')}
                    {headCell('result', 'Result', 'right')}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(({ game, isHome, won, result }) => (
                    <TableRow key={game.id}>
                      <TableCell>{formatSeason(game.season)}</TableCell>
                      <TableCell>{formatTime(game.startTime)}</TableCell>
                      <TableCell>{isHome ? 'Home' : 'Away'}</TableCell>
                      <TableCell align="right">
                        {/* On its own element: the design system colors every cell. */}
                        <Typography
                          component="span"
                          variant="inherit"
                          color={won ? 'success' : 'error'}
                        >
                          {result}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
