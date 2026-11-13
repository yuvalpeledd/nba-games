// login and signUp are the forms (the card's tabs); verify waits for the email's link to be opened; name finishes a
// sign-up that never reached the API (an account without a user); reset sends a password reset link.
export type LoginStep = 'login' | 'signUp' | 'verify' | 'name' | 'reset';

// repeatPassword: sign-up's password, typed again.
export type LoginField = 'name' | 'email' | 'password' | 'repeatPassword';
