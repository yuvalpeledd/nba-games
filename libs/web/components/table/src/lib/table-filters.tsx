import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { Box, Button, Chip, Stack } from '@mui/material';
import { Fragment, useState } from 'react';
import { FiltersPanel } from './filters-panel';

export type FilterOperator =
  | 'is'
  | 'isNot'
  | 'greaterThan'
  | 'lessThan'
  | 'after'
  | 'before';

// One filter on a column: `is`/`isNot` any of its values, the rest a bound (a number, or a day as YYYY-MM-DD).
export interface Filter<Column extends string = string> {
  column: Column;
  operator: FilterOperator;
  values: string[];
}

// How a table filters by a column: its name in the filters, and its value in a row. A select's options are the
// values its rows have; a date's value is a moment (ISO), compared by its day on the viewer's clock.
export type FilterColumn<Row> = { label: string } & (
  | { type: 'select'; value: (row: Row) => string | null }
  | { type: 'number'; value: (row: Row) => number | null }
  | { type: 'date'; value: (row: Row) => string | null }
);

export const operatorLabels: Record<FilterOperator, string> = {
  is: 'Is',
  isNot: 'Is Not',
  greaterThan: 'Greater Than',
  lessThan: 'Less Than',
  after: 'After',
  before: 'Before',
};

// A select's empty cells, listed as "(No Value)".
export const NO_VALUE = '';

// A filter's value as its chip and options show it.
export const valueLabel = (value: string, operator: FilterOperator) =>
  value === NO_VALUE
    ? '(No Value)'
    : operator === 'after' || operator === 'before'
      ? value.split('-').reverse().join('/')
      : value;

// A moment's day on the viewer's clock, as YYYY-MM-DD (the Canadian format is ISO's).
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA');

const matches = <Row,>(
  column: FilterColumn<Row>,
  { operator, values: [bound], values }: Filter,
  row: Row,
): boolean => {
  const value = column.value(row);
  switch (operator) {
    case 'is':
      return values.includes(String(value ?? NO_VALUE));
    case 'isNot':
      return !values.includes(String(value ?? NO_VALUE));
    case 'greaterThan':
      return value !== null && Number(value) > Number(bound);
    case 'lessThan':
      return value !== null && Number(value) < Number(bound);
    case 'after':
      return value !== null && dayOf(String(value)) > bound;
    case 'before':
      return value !== null && dayOf(String(value)) < bound;
  }
};

// portal's filters box: a table's rows that pass every filter, and its filter bar (an "Add Filter" button that opens
// the filters panel, and a chip per filter that removes it). Done in the browser: the tables have every row.
// ponytail: not in the URL (portal's are) and no date modes but a range; add them when a table needs them.
export function useTableFilters<Row, Column extends string>(
  rows: Row[],
  columns: Record<Column, FilterColumn<Row>>,
) {
  const [filters, setFilters] = useState<Filter<Column>[]>([]);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const filtered = rows.filter((row) =>
    filters.every((filter) => matches(columns[filter.column], filter, row)),
  );

  const filterBar = (
    <Stack
      direction="row"
      useFlexGap
      sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
    >
      <Button
        variant="outlined"
        startIcon={<FilterAltOutlinedIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Add Filter
      </Button>
      {filters.map((filter) => (
        <Chip
          key={`${filter.column}:${filter.operator}`}
          variant="outlined"
          onDelete={() => setFilters(filters.filter((f) => f !== filter))}
          label={
            <>
              {columns[filter.column].label}{' '}
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {operatorLabels[filter.operator].toLowerCase()}
              </Box>{' '}
              {filter.values.map((value, index) => (
                <Fragment key={value}>
                  {index > 0 && (
                    <Box
                      component="span"
                      sx={{ color: 'text.secondary', fontSize: 'caption' }}
                    >
                      {' OR '}
                    </Box>
                  )}
                  <Box component="span" sx={{ fontWeight: 500 }}>
                    {valueLabel(value, filter.operator)}
                  </Box>
                </Fragment>
              ))}
            </>
          }
        />
      ))}
      {anchor && (
        <FiltersPanel
          anchor={anchor}
          rows={rows}
          columns={columns}
          filters={filters}
          onApply={setFilters}
          onClose={() => setAnchor(null)}
        />
      )}
    </Stack>
  );

  return { rows: filtered, filterBar };
}
