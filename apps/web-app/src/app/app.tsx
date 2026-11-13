import { DashboardPage } from '@nba/web-dashboard-page';
import { AppShell, type Pages } from '@nba/web-shell-components';
import { StandingsPage } from '@nba/web-standings-page';
import { TeamSinglePage } from '@nba/web-team-single-page';
import { TeamsPage } from '@nba/web-teams-page';

// Every page, each from its lib, for AppShell's routes.
export const pages: Pages = {
  DashboardPage,
  StandingsPage,
  TeamsPage,
  TeamSinglePage,
};

export function App() {
  return <AppShell pages={pages} />;
}

export default App;
