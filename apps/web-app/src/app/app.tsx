import { DashboardPage } from '@nba/web-dashboard-page';
import { AppShell, type Pages } from '@nba/web-shell-components';
import { StandingsPage } from '@nba/web-standings-page';
import { TeamsPage } from '@nba/web-teams-page';

// Every page, each from its lib, for AppShell's routes.
export const pages: Pages = { DashboardPage, StandingsPage, TeamsPage };

export function App() {
  return <AppShell pages={pages} />;
}

export default App;
