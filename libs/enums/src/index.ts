// Enums more than one table stores, or none does. No imports: the web loads this too.

// An error's `code`, beside Nest's { statusCode, message }, where the web must tell errors apart.
export enum ErrorCode {
  // Signing up with an email another account's user has (Firebase keeps one account per email, so only after one
  // was deleted and made again).
  USER_EXISTS = 'User Exists',
  // A Firebase account whose email isn't verified yet: no session until it is.
  EMAIL_NOT_VERIFIED = 'Email Not Verified',
  // A prediction of a game that has started (or ended): picks lock at tip-off.
  PREDICTION_LOCKED = 'Prediction Locked',
  // Scoring a game that isn't final with a winner (yet, or ever: a canceled one voids its predictions).
  GAME_NOT_FINAL = 'Game Not Final',
  // Setting a group's score for a game that is completed (final or canceled): its picks are scored, or void.
  GAME_COMPLETED = 'Game Completed',
}
