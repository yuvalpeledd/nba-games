import { TableCell, TableSortLabel, Tooltip } from '@mui/material';
import { ReactNode, useState } from 'react';

// A cell's value for sorting: text, a number (times as epoch ms), or nothing.
type SortValue = string | number | null;

interface Sort<Column> {
  column: Column;
  direction: 'asc' | 'desc';
}

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

// outly's: a table's rows, sorted by the column whose header was clicked last (again: the other way), and its
// sortable header cells; the rows keep their own order until then. Text sorts by the language's rules (digits as
// numbers), numbers by size, and empty values always go last.
// ponytail: no paging (outly's has it); add it with the first table that can outgrow a screen (players, games).
export function useTableSort<Row, Column extends string>(
  rows: Row[],
  valueOf: Record<Column, (row: Row) => SortValue>,
) {
  const [sort, setSort] = useState<Sort<Column> | null>(null);
  const compare = (a: SortValue, b: SortValue): number => {
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    const order =
      typeof a === 'number' && typeof b === 'number'
        ? a - b
        : collator.compare(String(a), String(b));
    return sort?.direction === 'desc' ? -order : order;
  };
  const sorted = sort
    ? [...rows].sort((a, b) =>
        compare(valueOf[sort.column](a), valueOf[sort.column](b)),
      )
    : rows;

  // A column's header: its label, which sorts the rows by it, and what it means on hover or focus (`hint`). Numbers'
  // columns are right-aligned.
  const headCell = (
    column: Column,
    label: ReactNode,
    align?: 'right',
    hint?: string,
  ) => {
    const direction = sort?.column === column ? sort.direction : false;
    const sortLabel = (
      <TableSortLabel
        active={Boolean(direction)}
        direction={direction || 'asc'}
        onClick={() =>
          setSort({
            column,
            direction: direction === 'asc' ? 'desc' : 'asc',
          })
        }
      >
        {label}
      </TableSortLabel>
    );
    return (
      <TableCell key={column} sortDirection={direction} align={align}>
        {/* describeChild: the label stays the header's name, the hint its description. */}
        {hint ? (
          <Tooltip title={hint} describeChild>
            {sortLabel}
          </Tooltip>
        ) : (
          sortLabel
        )}
      </TableCell>
    );
  };

  return { rows: sorted, headCell };
}
