import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ReactNode, useState } from 'react';
import {
  type Filter,
  type FilterColumn,
  type FilterOperator,
  NO_VALUE,
  operatorLabels,
  valueLabel,
} from './table-filters';

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

const has = (text: string, search: string) =>
  text.toLowerCase().includes(search.trim().toLowerCase());

// The filters with a column's `operators` replaced by one of them with `values` (none: removed).
const withFilter = <Column extends string>(
  filters: Filter<Column>[],
  column: Column,
  operators: FilterOperator[],
  operator: FilterOperator,
  values: string[],
): Filter<Column>[] => [
  ...filters.filter(
    (f) => f.column !== column || !operators.includes(f.operator),
  ),
  ...(values.length ? [{ column, operator, values }] : []),
];

interface EditorProps<Row, Column extends string> {
  column: Column;
  rows: Row[];
  definition: FilterColumn<Row>;
  filters: Filter<Column>[];
  onChange: (filters: Filter<Column>[]) => void;
}

// A select's editor: its values to check, the rows having any of them, or none.
function SelectEditor<Row, Column extends string>({
  column,
  rows,
  definition,
  filters,
  onChange,
}: EditorProps<Row, Column>) {
  const operators: FilterOperator[] = ['is', 'isNot'];
  const current = filters.find(
    (f) => f.column === column && operators.includes(f.operator),
  );
  const selected = current?.values ?? [];
  const [operator, setOperator] = useState(current?.operator ?? 'is');
  const [search, setSearch] = useState('');
  // Checked first as the editor opened, so a click doesn't move its option.
  const [checkedAtOpen] = useState(selected);
  const options = [
    ...new Set(rows.map((row) => String(definition.value(row) ?? NO_VALUE))),
  ]
    .filter((option) => has(valueLabel(option, 'is'), search))
    .sort(
      (a, b) =>
        Number(checkedAtOpen.includes(b)) - Number(checkedAtOpen.includes(a)) ||
        collator.compare(a, b),
    );
  const write = (nextOperator: FilterOperator, values: string[]) =>
    onChange(withFilter(filters, column, operators, nextOperator, values));

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        placeholder="Search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        slotProps={{ htmlInput: { 'aria-label': 'Search' } }}
      />
      <TextField
        select
        size="small"
        label="Filter by"
        value={operator}
        onChange={(event) => {
          const next = event.target.value as FilterOperator;
          setOperator(next);
          write(next, selected);
        }}
      >
        <MenuItem value="is">any of the selected</MenuItem>
        <MenuItem value="isNot">none of the selected</MenuItem>
      </TextField>
      <FormGroup sx={{ maxHeight: 240, overflowY: 'auto', flexWrap: 'nowrap' }}>
        {options.map((option) => (
          <FormControlLabel
            key={option}
            label={valueLabel(option, 'is')}
            control={
              <Checkbox
                checked={selected.includes(option)}
                onChange={(event) =>
                  write(
                    operator,
                    event.target.checked
                      ? [...selected, option]
                      : selected.filter((value) => value !== option),
                  )
                }
              />
            }
          />
        ))}
      </FormGroup>
    </Stack>
  );
}

// A number's or a date's editor: a bound each way, either or both.
function BoundsEditor<Row, Column extends string>({
  column,
  definition,
  filters,
  onChange,
}: EditorProps<Row, Column>) {
  const isDate = definition.type === 'date';
  const operators: FilterOperator[] = isDate
    ? ['after', 'before']
    : ['greaterThan', 'lessThan'];
  return (
    <Stack spacing={2}>
      {operators.map((operator) => (
        <TextField
          key={operator}
          size="small"
          type={isDate ? 'date' : 'number'}
          label={operatorLabels[operator]}
          value={
            filters.find((f) => f.column === column && f.operator === operator)
              ?.values[0] ?? ''
          }
          onChange={(event) =>
            onChange(
              withFilter(
                filters,
                column,
                [operator],
                operator,
                event.target.value ? [event.target.value] : [],
              ),
            )
          }
          slotProps={{ inputLabel: { shrink: true } }}
        />
      ))}
    </Stack>
  );
}

const Card = ({ width, children }: { width: number; children: ReactNode }) => (
  <Paper
    elevation={8}
    sx={{ width: { xs: '100%', sm: width }, p: 2, alignSelf: 'flex-start' }}
  >
    {children}
  </Paper>
);

// portal's filters panel: the columns to filter by, and the one picked's editor beside them. An editor's "Add Filter"
// keeps its changes in the panel, and "Apply Filters" applies the panel's to the table; "Clear All" applies none.
export function FiltersPanel<Row, Column extends string>({
  anchor,
  rows,
  columns,
  filters,
  onApply,
  onClose,
}: {
  anchor: HTMLElement;
  rows: Row[];
  columns: Record<Column, FilterColumn<Row>>;
  filters: Filter<Column>[];
  onApply: (filters: Filter<Column>[]) => void;
  onClose: () => void;
}) {
  // Kept by the editors' "Add Filter", and the open editor's own.
  const [pending, setPending] = useState(filters);
  const [staging, setStaging] = useState(filters);
  const [selected, setSelected] = useState<Column | null>(null);
  const [search, setSearch] = useState('');
  const countOf = (column: Column) =>
    pending.filter((f) => f.column === column).length;
  // Those filtered by first, then by name.
  const listed = (Object.keys(columns) as Column[])
    .filter((column) => has(columns[column].label, search))
    .sort(
      (a, b) =>
        countOf(b) - countOf(a) ||
        collator.compare(columns[a].label, columns[b].label),
    );
  const keep = (next: Filter<Column>[]) => {
    setPending(next);
    setStaging(next);
    setSelected(null);
  };
  const Editor =
    selected && columns[selected].type === 'select'
      ? SelectEditor
      : BoundsEditor;

  return (
    <Popover
      open
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            p: 1,
            bgcolor: 'transparent',
            boxShadow: 'none',
          },
        },
      }}
    >
      <Card width={280}>
        <Stack spacing={1}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="subtitle1" component="h2">
              Filters
            </Typography>
            <IconButton aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <TextField
            size="small"
            placeholder="Search Filter"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': 'Search Filter' } }}
          />
          {listed.length === 0 ? (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Typography>No Content Found</Typography>
              <Typography variant="caption" color="text.secondary">
                Try searching for something else
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ maxHeight: 320, overflowY: 'auto' }}>
              {listed.map((column) => (
                <ListItemButton
                  key={column}
                  selected={column === selected}
                  onClick={() => {
                    if (column === selected) return;
                    // Another column's: what its editor didn't add is dropped.
                    setStaging(pending);
                    setSelected(column);
                  }}
                >
                  <ListItemText primary={columns[column].label} />
                  {countOf(column) > 0 && (
                    <Chip
                      size="small"
                      color="primary"
                      label={countOf(column)}
                    />
                  )}
                  <KeyboardArrowRightIcon fontSize="small" />
                </ListItemButton>
              ))}
            </List>
          )}
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button
              disabled={pending.length === 0}
              onClick={() => {
                keep([]);
                onApply([]);
              }}
            >
              Clear All
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                onApply(pending);
                onClose();
              }}
            >
              Apply Filters
            </Button>
          </Stack>
        </Stack>
      </Card>
      {selected && (
        <Card width={300}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" component="h3">
              {columns[selected].label}
            </Typography>
            <Editor
              key={selected}
              column={selected}
              rows={rows}
              definition={columns[selected]}
              filters={staging}
              onChange={setStaging}
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'flex-end' }}
            >
              <Button
                disabled={!staging.some((f) => f.column === selected)}
                onClick={() =>
                  keep(staging.filter((f) => f.column !== selected))
                }
              >
                Clear
              </Button>
              <Button variant="contained" onClick={() => keep(staging)}>
                Add Filter
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}
    </Popover>
  );
}
