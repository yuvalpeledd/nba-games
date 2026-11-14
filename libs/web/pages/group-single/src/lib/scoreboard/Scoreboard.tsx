import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import type { GroupDetailsDto } from '@nba/dtos-groups';
import { statHints } from '@nba/web-core';
import { useTableSort } from '@nba/web-table-components';
import { useState } from 'react';

const ROWS_PER_PAGE = 5;

// The group's members by score, highest first (a point per right pick; equal scores share a rank), 5 a page (no pager
// while they fit one): a narrow, dense table, as it has only three short columns.
export function Scoreboard({
  members,
  ownerId,
}: {
  members: GroupDetailsDto['members'];
  ownerId: string;
}) {
  const [page, setPage] = useState(0);
  const ranked = [...members]
    .sort((a, b) => b.score - a.score)
    .map((member) => ({
      ...member,
      rank: members.filter((other) => other.score > member.score).length + 1,
    }));
  const { rows, headCell } = useTableSort(ranked, {
    rank: (row) => row.rank,
    member: (row) => row.name,
    score: (row) => row.score,
  });
  // Back to the last page there is when members leave.
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / ROWS_PER_PAGE) - 1),
  );

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <TableContainer>
        <Table
          aria-label="Scoreboard"
          size="small"
          // ponytail: shorter rows here only; move to _table.scss's sizeSmall if every dense table should have them.
          // The number columns (rank, score) as narrow as their content, so the member's name takes the rest.
          sx={{
            '& .MuiTableCell-body': { blockSize: 40 },
            '& .MuiTableCell-alignRight': {
              inlineSize: '1%',
              whiteSpace: 'nowrap',
            },
          }}
        >
          <TableHead>
            <TableRow>
              {headCell('rank', '#', 'right')}
              {headCell('member', 'Member')}
              {headCell('score', 'Score', 'right', statHints.groupScore)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .slice(shownPage * ROWS_PER_PAGE, (shownPage + 1) * ROWS_PER_PAGE)
              .map(({ id, name, score, rank }) => (
                <TableRow key={id}>
                  <TableCell align="right">{rank}</TableCell>
                  <TableCell>
                    {name}
                    {id === ownerId && (
                      <Typography
                        component="span"
                        variant="inherit"
                        color="text.secondary"
                      >
                        {' '}
                        · Owner
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{score}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > ROWS_PER_PAGE && (
        <TablePagination
          component="div"
          count={rows.length}
          page={shownPage}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[]}
          onPageChange={(_, next) => setPage(next)}
        />
      )}
    </Stack>
  );
}
