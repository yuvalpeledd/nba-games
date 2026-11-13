import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { ReactNode } from 'react';
import colors from './theme.module.scss';

// `prepend` injects MUI's styles before ours, so component SCSS (and the design-system lib) wins over MUI's
// defaults at equal specificity.
const cache = createCache({ key: 'mui', prepend: true });

// Inter, loaded in index.html.
const FONT_FAMILY =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

// outly's look: what CSS can't set is here; the design-system lib styles the rest.
const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      dark: colors.primaryDark,
      contrastText: colors.onPrimary,
    },
    success: { main: colors.success },
    info: { main: colors.info },
    warning: { main: colors.warning },
    error: { main: colors.error },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.textDisabled,
    },
    background: { default: colors.background, paper: colors.paper },
    divider: colors.divider,
  },
  typography: {
    fontFamily: FONT_FAMILY,
    // Every page's title.
    h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
    },
    // Labels sit above fields (design-system's _fields.scss), so they never float inside them.
    MuiInputLabel: { defaultProps: { shrink: true } },
    MuiSelect: { defaultProps: { IconComponent: KeyboardArrowDownIcon } },
    MuiTab: { defaultProps: { disableRipple: true } },
  },
});

export function ThemeRoot({ children }: { children: ReactNode }) {
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
