import { DashboardPage } from '@nba/web-dashboard-page';
import { GamesPage } from '@nba/web-games-page';
import { LoginPage } from '@nba/web-login-page';
import { ProfilePage } from '@nba/web-profile-page';
import { AppShell, type Pages } from '@nba/web-shell-components';
import { StandingsPage } from '@nba/web-standings-page';
import { TeamSinglePage } from '@nba/web-team-single-page';

// Every page, each from its lib, for AppShell's routes.
export const pages: Pages = {
  DashboardPage,
  GamesPage,
  LoginPage,
  ProfilePage,
  StandingsPage,
  TeamSinglePage,
};

export function App() {
  return <AppShell pages={pages} />;
}

export default App;
