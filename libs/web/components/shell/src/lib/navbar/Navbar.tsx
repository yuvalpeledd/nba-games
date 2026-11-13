import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router';
import './navbar.scss';

const items: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/games', label: 'Games', icon: <EventIcon /> },
  { to: '/standings', label: 'Standings', icon: <LeaderboardIcon /> },
];

function NavbarLink({ to, label, icon }: (typeof items)[number]) {
  // A section's pages under it (/games/...) keep it selected; the dashboard only at /.
  const isActive = useMatch({ path: to, end: to === '/' }) !== null;
  return (
    <ListItemButton component={NavLink} to={to} selected={isActive}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={label} className="navbar__label" />
    </ListItemButton>
  );
}

export function Navbar() {
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      className="navbar"
      classes={{ paper: 'navbar__paper' }}
    >
      <div className="navbar__brand">
        <SportsBasketballIcon />
        <span className="navbar__label">NBA Games</span>
      </div>
      <List component="nav" aria-label="Navigation">
        {items.map((item) => (
          <NavbarLink key={item.to} {...item} />
        ))}
      </List>
    </Drawer>
  );
}
