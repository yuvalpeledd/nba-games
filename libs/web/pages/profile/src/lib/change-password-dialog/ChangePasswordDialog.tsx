import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { newPasswordSchema } from '@nba/dtos-auth';
import { firebaseAuth, firebaseCodeOf, invalidFields } from '@nba/web-core';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from 'firebase/auth';
import { FormEvent, useId, useState } from 'react';
import { object, ref, string } from 'yup';
import type { ChangePasswordDialogProps, PasswordField } from '../types';
import '../dialog-form.scss';

const EMPTY: Record<PasswordField, string> = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const labels: Record<PasswordField, string> = {
  currentPassword: 'Current password',
  newPassword: 'New password',
  confirmPassword: 'Confirm new password',
};

// The new one must pass the sign-up form's rule, and be typed twice; Firebase checks the current one.
const schema = object({
  currentPassword: string().required(),
  newPassword: newPasswordSchema,
  confirmPassword: string().oneOf([ref('newPassword')]),
});

const fieldMessages: Record<PasswordField, string> = {
  currentPassword: 'Required',
  newPassword: 'Password must be at least 8 characters',
  confirmPassword: "The passwords don't match",
};

const WRONG_PASSWORD = 'Wrong password';

// Why Firebase refused. With email enumeration protection (new projects' default), a wrong password is
// invalid-credential.
const failures: Record<string, string> = {
  'auth/invalid-credential': WRONG_PASSWORD,
  'auth/invalid-login-credentials': WRONG_PASSWORD,
  'auth/wrong-password': WRONG_PASSWORD,
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
};

// Changes the password (Firebase's: the API never sees it). Firebase wants a recent sign-in for that, so the current
// password signs in again first. This session goes on with the tokens Firebase answers; the account's others end
// within the hour (their renewals are revoked).
export function ChangePasswordDialog({
  email,
  onToast,
  onClose,
}: ChangePasswordDialogProps) {
  const formId = useId();
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [values, setValues] = useState(EMPTY);
  const [invalid, setInvalid] = useState<PasswordField[]>([]);
  const [isWrongPassword, setWrongPassword] = useState(false);
  const [isSaving, setSaving] = useState(false);

  const change = async () => {
    const account = (await firebaseAuth()).currentUser as User;
    const credential = EmailAuthProvider.credential(
      account.email as string,
      values.currentPassword,
    );
    await reauthenticateWithCredential(account, credential);
    await updatePassword(account, values.newPassword);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const fields = await invalidFields<PasswordField>(schema, values);
    setInvalid(fields);
    setWrongPassword(false);
    if (fields.length) return;
    setSaving(true);
    try {
      await change();
      onToast('Password changed');
      onClose();
    } catch (error) {
      const failure = failures[firebaseCodeOf(error) ?? ''];
      setWrongPassword(failure === WRONG_PASSWORD);
      onToast(failure ?? "Couldn't change your password, try again");
    } finally {
      setSaving(false);
    }
  };

  const field = (name: PasswordField, autoComplete: string) => {
    const message =
      name === 'currentPassword' && isWrongPassword
        ? WRONG_PASSWORD
        : invalid.includes(name)
          ? fieldMessages[name]
          : null;
    return (
      <TextField
        label={labels[name]}
        type="password"
        autoComplete={autoComplete}
        value={values[name]}
        onChange={(event) =>
          setValues({ ...values, [name]: event.target.value })
        }
        error={message !== null}
        helperText={message}
        fullWidth
      />
    );
  };

  return (
    <Dialog open onClose={onClose} fullScreen={isPhone} fullWidth maxWidth="xs">
      <DialogTitle>Change password</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id={formId}
          spacing={2}
          onSubmit={submit}
          noValidate
          className="dialog-form"
        >
          {/* Tells password managers whose password this is. */}
          <input
            type="email"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          {field('currentPassword', 'current-password')}
          {field('newPassword', 'new-password')}
          {field('confirmPassword', 'new-password')}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form={formId}
          variant="contained"
          disabled={isSaving}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
