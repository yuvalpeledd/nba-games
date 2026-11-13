import EditIcon from '@mui/icons-material/Edit';
import PasswordIcon from '@mui/icons-material/Password';
import { Avatar, Button, Snackbar, Typography } from '@mui/material';
import { useMe } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useState } from 'react';
import { ChangePasswordDialog } from './change-password-dialog/ChangePasswordDialog';
import { ProfileDialog } from './profile-dialog/ProfileDialog';
import './profile-page.scss';

// Initials until users have profile pictures.
const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

// The signed-in user's own page (outly's): their name with Edit (the name) and Change password, then their details.
// ponytail: its own snackbar, like PredictionCell's; an app-wide toast once a third mutation needs one.
export function ProfilePage() {
  const { data: me, isError } = useMe();
  const [isEditing, setEditing] = useState(false);
  const [isChangingPassword, setChangingPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  if (!me) return <PageLoader error={isError} />;

  return (
    <section className="profile-page">
      <div className="profile-page__header">
        <Avatar className="profile-page__avatar">{initialsOf(me.name)}</Avatar>
        <Typography variant="h1" className="profile-page__name">
          {me.name}
        </Typography>
        <div className="profile-page__actions">
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<PasswordIcon />}
            onClick={() => setChangingPassword(true)}
          >
            Change password
          </Button>
        </div>
      </div>
      <section className="profile-page__details">
        <Typography variant="subtitle2" component="h2">
          Details
        </Typography>
        <dl>
          <div>
            <dt>Email</dt>
            <dd>{me.email}</dd>
          </div>
        </dl>
      </section>
      {isEditing && (
        <ProfileDialog
          user={me}
          onToast={setToast}
          onClose={() => setEditing(false)}
        />
      )}
      {isChangingPassword && (
        <ChangePasswordDialog
          email={me.email}
          onToast={setToast}
          onClose={() => setChangingPassword(false)}
        />
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </section>
  );
}
