import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LogoutIcon from '@mui/icons-material/Logout';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { clearSession, useMe } from '@nba/web-core';
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

// Who's signed in (every page with the navbar is for someone signed in, RequireAuth), and Log out.
function Account() {
  const { data: me } = useMe();
  return (
    <>
      <ListItem>
        <ListItemIcon>
          <AccountCircleIcon />
        </ListItemIcon>
        <ListItemText primary={me?.name ?? ' '} className="navbar__label" />
      </ListItem>
      <ListItemButton onClick={clearSession}>
        <ListItemIcon>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Log out" className="navbar__label" />
      </ListItemButton>
    </>
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
      <List aria-label="Account" className="navbar__account">
        <Account />
      </List>
    </Drawer>
  );
}
