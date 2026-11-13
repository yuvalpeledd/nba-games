import type { UserDto } from '@nba/dtos-auth';

// The page's dialogs: mounted only while open, they tell the page what to toast (it outlives them).
export interface ProfileDialogProps {
  // Whose profile: the signed-in user's, as the form starts.
  user: UserDto;
  onToast: (message: string) => void;
  onClose: () => void;
}

export interface ChangePasswordDialogProps {
  // The signed-in user's, for password managers (whose saved password this replaces).
  email: string;
  onToast: (message: string) => void;
  onClose: () => void;
}

export type PasswordField =
  | 'currentPassword'
  | 'newPassword'
  | 'confirmPassword';
