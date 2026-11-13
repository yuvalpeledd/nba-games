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
import { isPredictionLocked, scorePrediction } from '@nba/dtos-predictions';
import { PredictionPick } from '@nba/sql-predictions/enums';
import {
  formatTime,
  formatWinPct,
  statHints,
  useGroupPredictions,
} from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableFilters, useTableSort } from '@nba/web-table-components';

const resultLabel = (right: boolean | null) =>
  right === null ? 'N/A' : right ? 'Right' : 'Wrong';

// `count` of `of`, and its share: `3 (60.0%)`.
const countAndShare = (count: number, of: number) =>
  of ? `${count} (${formatWinPct(count / of)})` : '0';

// Every member's pick of the game and how the group split; which team each picked only once the game begins (until
// then the server tells only who picked), and whether it was right once it's final.
export function GroupPredictionsDialog({
  groupId,
  game,
  away,
  home,
  onClose,
}: {
  groupId: string;
  game: GameDto;
  away: string;
  home: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: members, isError } = useGroupPredictions(groupId, game.id);
  const locked = isPredictionLocked(game);
  const teamOf = (pick: PredictionPick | null) =>
    pick === PredictionPick.HOME
      ? home
      : pick === PredictionPick.AWAY
        ? away
        : null;
  const rows = (members ?? []).map((member) => ({
    ...member,
    pickLabel: !member.picked ? 'None' : (teamOf(member.pick) ?? 'Picked'),
    right: scorePrediction(member, game),
  }));
  const picked = rows.filter((row) => row.picked);
  const scored = picked.filter((row) => row.right !== null);
  const shareOf = (pick: PredictionPick) =>
    countAndShare(
      picked.filter((row) => row.pick === pick).length,
      picked.length,
    );
  // Label, value, hint.
  const stats: [string, string, string][] = [
    ['Picked', `${picked.length} of ${rows.length}`, statHints.groupPicked],
  ];
  if (locked) {
    stats.push(
      [away, shareOf(PredictionPick.AWAY), statHints.groupPickShare],
      [home, shareOf(PredictionPick.HOME), statHints.groupPickShare],
    );
  }
  if (scored.length) {
    const right = scored.filter((row) => row.right).length;
    stats.push([
      'Right',
      countAndShare(right, scored.length),
      statHints.groupRight,
    ]);
  }
  const filtered = useTableFilters(rows, {
    member: { label: 'Member', type: 'select', value: (row) => row.name },
    pick: { label: 'Pick', type: 'select', value: (row) => row.pickLabel },
    result: {
      label: 'Result',
      type: 'select',
      value: (row) => resultLabel(row.right),
    },
  });
  const { rows: shown, headCell } = useTableSort(filtered.rows, {
    member: (row) => row.name,
    pick: (row) => row.pickLabel,
    result: (row) => resultLabel(row.right),
  });

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth>
      <DialogTitle>
        Predictions: {away} at {home}
        <Typography color="text.secondary">
          {formatTime(game.startTime)}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {!members ? (
          <PageLoader error={isError} />
        ) : (
          <Stack spacing={3}>
            <Stack
              component="dl"
              direction="row"
              sx={{ m: 0, flexWrap: 'wrap', columnGap: 4, rowGap: 2 }}
            >
              {stats.map(([label, value, hint]) => (
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
              ))}
            </Stack>
            {!locked && (
              <Typography color="text.secondary">
                Which team each member picked shows once the game begins.
              </Typography>
            )}
            {filtered.filterBar}
            <TableContainer>
              <Table aria-label="Members' predictions">
                <TableHead>
                  <TableRow>
                    {headCell('member', 'Member')}
                    {headCell('pick', 'Pick')}
                    {headCell('result', 'Result')}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shown.map(({ id, name, pickLabel, right }) => (
                    <TableRow key={id}>
                      <TableCell>{name}</TableCell>
                      <TableCell>{pickLabel}</TableCell>
                      <TableCell>
                        {/* On its own element: the design system colors every cell. */}
                        <Typography
                          component="span"
                          variant="inherit"
                          color={
                            right === null
                              ? undefined
                              : right
                                ? 'success'
                                : 'error'
                          }
                        >
                          {resultLabel(right)}
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
