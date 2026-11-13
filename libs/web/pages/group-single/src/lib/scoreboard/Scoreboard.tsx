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
import { useTableFilters, useTableSort } from '@nba/web-table-components';
import { useState } from 'react';

const ROWS_PER_PAGE = 5;

// The group's members by score, highest first (a point per right pick; equal scores share a rank), 5 a page.
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
  const filtered = useTableFilters(ranked, {
    member: { label: 'Member', type: 'select', value: (row) => row.name },
    score: { label: 'Score', type: 'number', value: (row) => row.score },
  });
  const { rows, headCell } = useTableSort(filtered.rows, {
    rank: (row) => row.rank,
    member: (row) => row.name,
    score: (row) => row.score,
  });
  // Back to the last page there is when filters leave fewer rows.
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / ROWS_PER_PAGE) - 1),
  );

  return (
    <Stack spacing={2}>
      {filtered.filterBar}
      <TableContainer>
        <Table aria-label="Scoreboard">
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
      <TablePagination
        component="div"
        count={rows.length}
        page={shownPage}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[]}
        onPageChange={(_, next) => setPage(next)}
      />
    </Stack>
  );
}
