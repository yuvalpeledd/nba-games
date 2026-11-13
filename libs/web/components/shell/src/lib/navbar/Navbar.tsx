import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { clearSession, useMe } from '@nba/web-core';
import { ReactNode, useState } from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router';
import './navbar.scss';

const items: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/games', label: 'Games', icon: <EventIcon /> },
  { to: '/standings', label: 'Standings', icon: <LeaderboardIcon /> },
  { to: '/groups', label: 'Groups', icon: <GroupsIcon /> },
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

// Who's signed in (every page with the navbar is for someone signed in, RequireAuth), and their menu (outly's):
// Profile and Log out. The navbar stays open while it is.
function Account({
  onOpenChange,
}: {
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const setMenu = (next: HTMLElement | null) => {
    setAnchor(next);
    onOpenChange(next !== null);
  };

  return (
    <>
      <ListItemButton
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        onClick={(event) => setMenu(event.currentTarget)}
      >
        <ListItemIcon>
          <AccountCircleIcon />
        </ListItemIcon>
        <ListItemText primary={me?.name ?? ' '} className="navbar__label" />
      </ListItemButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MenuItem
          onClick={() => {
            setMenu(null);
            navigate('/profile');
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenu(null);
            clearSession(); // RequireAuth then sends them to /login
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export function Navbar() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      className={isMenuOpen ? 'navbar navbar--open' : 'navbar'}
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
        <Account onOpenChange={setMenuOpen} />
      </List>
    </Drawer>
  );
}
